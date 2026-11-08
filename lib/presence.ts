export const HEARTBEAT_SECONDS = 30;
export const ONLINE_TTL_MS = 90_000;
const MAX_SESSION_MS = 24 * 60 * 60 * 1000;
const SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export class PresenceError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export function validateIdentity(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new PresenceError(400, "Dados inválidos.");
  const { userId, username, displayName } = input as Record<string, unknown>;
  const id = typeof userId === "number" ? String(userId) : userId;
  if (typeof id !== "string" || !/^[1-9][0-9]{0,15}$/.test(id) || !Number.isSafeInteger(Number(id))) throw new PresenceError(400, "UserId inválido.");
  if (typeof username !== "string" || !/^[A-Za-z0-9_]{3,20}$/.test(username)) throw new PresenceError(400, "Nome inválido.");
  if (typeof displayName !== "string" || !displayName.trim() || [...displayName].length > 50 || /[\u0000-\u001f\u007f]/.test(displayName)) throw new PresenceError(400, "Nome de exibição inválido.");
  return { userId: id, username, displayName: displayName.trim() };
}

export async function hash(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(v => v.toString(16).padStart(2, "0")).join("");
}

export function validateGame(input: unknown) {
  const { placeId, gameName } = input as Record<string, unknown>;
  const id = typeof placeId === "number" ? String(placeId) : placeId;
  if (id != null && (typeof id !== "string" || !/^[1-9][0-9]{0,15}$/.test(id) || !Number.isSafeInteger(Number(id)))) throw new PresenceError(400, "PlaceId inválido.");
  if (gameName != null && (typeof gameName !== "string" || !gameName.trim() || [...gameName].length > 160 || /[\u0000-\u001f\u007f]/.test(gameName) || id == null)) throw new PresenceError(400, "Nome do jogo inválido.");
  return { placeId: id ?? null, gameName: typeof gameName === "string" ? gameName.trim() : null };
}

export async function rateLimit(db: D1Database, client: string, action: string, limit: number, now = Date.now()) {
  // Never store raw IPs; each rate-limit key changes every minute and expires.
  const bucket = await hash(`${action}:${Math.floor(now / 60_000)}:${client}`);
  const row = await db.prepare(`INSERT INTO presence_rate_limits (bucket, hits, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1 RETURNING hits`).bind(bucket, now + 120_000).first<{ hits: number }>();
  if (!row || row.hits > limit) throw new PresenceError(429, "Muitas tentativas. Aguarde um minuto.");
}

export async function startSession(db: D1Database, input: unknown, now = Date.now()) {
  const user = validateIdentity(input);
  const currentGame = validateGame(input);
  const id = crypto.randomUUID();
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map(v => v.toString(16).padStart(2, "0")).join("");
  const tokenHash = await hash(token);
  // A session is an unverified client report, never an account login.
  await db.batch([
    db.prepare(`INSERT INTO presence_users (user_id, username, display_name, first_seen, last_seen) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET username = excluded.username, display_name = excluded.display_name,
      last_seen = MAX(presence_users.last_seen, excluded.last_seen)`).bind(user.userId, user.username, user.displayName, now, now),
    db.prepare(`INSERT INTO presence_sessions (id, user_id, token_hash, created_at, last_seen, expires_at, place_id, game_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, user.userId, tokenHash, now, now, now + ONLINE_TTL_MS, currentGame.placeId, currentGame.gameName),
    db.prepare(`DELETE FROM presence_sessions WHERE id IN (SELECT id FROM presence_sessions WHERE last_seen < ? LIMIT 500)`).bind(now - SESSION_RETENTION_MS),
    db.prepare(`DELETE FROM presence_rate_limits WHERE bucket IN (SELECT bucket FROM presence_rate_limits WHERE expires_at < ? LIMIT 500)`).bind(now),
  ]);
  return { sessionId: id, token, heartbeatSeconds: HEARTBEAT_SECONDS, expiresInSeconds: ONLINE_TTL_MS / 1000 };
}

async function authenticateSession(db: D1Database, token: string, now: number) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new PresenceError(401, "Sessão inválida.");
  const tokenHash = await hash(token);
  const session = await db.prepare(`SELECT id, user_id, created_at, last_seen, ended_at FROM presence_sessions WHERE token_hash = ?`)
    .bind(tokenHash).first<{ id: string; user_id: string; created_at: number; last_seen: number; ended_at: number | null }>();
  if (!session || now - session.created_at >= MAX_SESSION_MS) throw new PresenceError(401, "Sessão expirada.");
  return session;
}

export async function heartbeat(db: D1Database, token: string, now = Date.now()) {
  const session = await authenticateSession(db, token, now);
  if (session.ended_at !== null) throw new PresenceError(401, "Sessão encerrada.");
  if (now - session.last_seen < 15_000) return { ok: true, heartbeatSeconds: HEARTBEAT_SECONDS };
  const results = await db.batch([
    db.prepare(`UPDATE presence_sessions SET last_seen = MAX(last_seen, ?), expires_at = MAX(expires_at, ?)
      WHERE id = ? AND ended_at IS NULL`).bind(now, now + ONLINE_TTL_MS, session.id),
    db.prepare(`UPDATE presence_users SET last_seen = MAX(last_seen, ?) WHERE user_id = ?
      AND EXISTS (SELECT 1 FROM presence_sessions WHERE id = ? AND ended_at IS NULL)`).bind(now, session.user_id, session.id),
  ]);
  if (!results[0].meta.changes) throw new PresenceError(401, "Sessão encerrada.");
  return { ok: true, heartbeatSeconds: HEARTBEAT_SECONDS };
}

export async function endSession(db: D1Database, token: string, now = Date.now()) {
  const session = await authenticateSession(db, token, now);
  if (session.ended_at !== null) return { ok: true };
  await db.batch([
    db.prepare(`UPDATE presence_sessions SET ended_at = ?, expires_at = ?, last_seen = MAX(last_seen, ?)
      WHERE id = ? AND ended_at IS NULL`).bind(now, now, now, session.id),
    db.prepare(`UPDATE presence_users SET last_seen = MAX(last_seen, ?) WHERE user_id = ?`).bind(now, session.user_id),
  ]);
  return { ok: true };
}

export type PresenceUser = { userId: string; username: string; displayName: string; firstSeen: number; lastSeen: number; activeSessions: number; online: boolean; placeId: string | null; gameName: string | null; gameImageUrl?: string | null };
export type PresenceSnapshot = { users: PresenceUser[]; stats: { total: number; online: number; today: number }; totalResults: number; page: number; pageSize: number; serverTime: number; ingestEnabled: boolean };

export async function listPresence(db: D1Database, options: { q?: string; status?: string; page?: number }, now = Date.now()) {
  const q = (options.q ?? "").slice(0, 80).trim().replace(/[\\%_]/g, "\\$&");
  const pattern = `%${q}%`;
  const page = Math.max(1, Math.min(10_000, Math.floor(options.page || 1)));
  const pageSize = 40;
  const status = options.status === "online" ? "AND active_sessions > 0" : options.status === "offline" ? "AND active_sessions = 0" : "";
  const cte = `WITH active AS (SELECT user_id, place_id, game_name,
    COUNT(*) OVER (PARTITION BY user_id) AS active_sessions,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY last_seen DESC, created_at DESC, id DESC) AS latest
    FROM presence_sessions WHERE ended_at IS NULL AND expires_at > ?),
    presence AS (SELECT u.*, COALESCE(s.active_sessions, 0) AS active_sessions, s.place_id, s.game_name
    FROM presence_users u LEFT JOIN active s ON s.user_id = u.user_id AND s.latest = 1)`;
  const filter = `WHERE (username LIKE ? ESCAPE '\\' OR display_name LIKE ? ESCAPE '\\' OR user_id LIKE ? ESCAPE '\\') ${status}`;
  const results = await db.batch([
    db.prepare(`${cte} SELECT user_id AS userId, username, display_name AS displayName, first_seen AS firstSeen,
      last_seen AS lastSeen, active_sessions AS activeSessions, place_id AS placeId, game_name AS gameName FROM presence ${filter}
      ORDER BY (active_sessions > 0) DESC, last_seen DESC, user_id ASC LIMIT ? OFFSET ?`)
      .bind(now, pattern, pattern, pattern, pageSize, (page - 1) * pageSize),
    db.prepare(`${cte} SELECT COUNT(*) AS total FROM presence ${filter}`).bind(now, pattern, pattern, pattern),
    db.prepare(`${cte} SELECT COUNT(*) AS total, COALESCE(SUM(active_sessions > 0), 0) AS online,
      COALESCE(SUM(last_seen >= ?), 0) AS today FROM presence`).bind(now, now - 86_400_000),
  ]);
  const rows = results[0].results as Omit<PresenceUser, "online">[];
  return {
    users: rows.map(row => ({ ...row, online: row.activeSessions > 0 })),
    stats: results[2].results[0] as PresenceSnapshot["stats"],
    totalResults: (results[1].results[0] as { total: number }).total,
    page, pageSize, serverTime: now,
  };
}
