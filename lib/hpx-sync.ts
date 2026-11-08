export type SyncRoom = { id: string; participants: number; effects: number; sequence: number };
export type SyncState = {
  status: "unconfigured" | "disabled" | "needs_auth" | "connected" | "unavailable";
  integrated?: boolean;
  serverUrl: string | null; loaderUrl: string | null; message?: string;
  metrics?: { participants: number; rooms: number; effects: number; eventsReceived: number; eventsDistributed: number; renderAcknowledgements: number; latency: number | null };
  rooms?: SyncRoom[];
};
export type BridgeSession = { token: string; serverUrl: string; ownerId: string; expiresAt: number };
export const BRIDGE_COOKIE = "hpx_sync_bridge";
export function syncOrigin(value?: string) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) throw new Error("invalid_sync_origin");
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)) throw new Error("invalid_sync_origin");
  return url.origin;
}
function encode(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, ""); }
function decode(value: string) { return Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), c => c.charCodeAt(0)); }
async function key(secret: string) {
  if (secret.length < 24) throw new Error("bridge_key_missing");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function sealBridge(session: BridgeSession, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode("HPX-Sync-Bridge-v1") }, await key(secret), new TextEncoder().encode(JSON.stringify(session)));
  return `${encode(iv)}.${encode(new Uint8Array(encrypted))}`;
}
export async function openBridge(value: string, secret: string, ownerId: string, serverUrl: string, now = Date.now()): Promise<BridgeSession | null> {
  try {
    if (value.length > 2048) return null;
    const parts = value.split("."); if (parts.length !== 2) return null;
    const decoded = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(parts[0]), additionalData: new TextEncoder().encode("HPX-Sync-Bridge-v1") }, await key(secret), decode(parts[1]));
    const session = JSON.parse(new TextDecoder().decode(decoded)) as BridgeSession;
    if (session.ownerId !== ownerId || session.serverUrl !== serverUrl || !Number.isFinite(session.expiresAt) || session.expiresAt <= now || !/^[A-Za-z0-9_-]{32,128}$/.test(session.token)) return null;
    return session;
  } catch { return null; }
}
export function bridgeCookie(value: string, maxAge: number) {
  return `${BRIDGE_COOKIE}=${value}; Path=/api/admin/sync; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.max(0, Math.min(1800, maxAge))}`;
}
export function readBridgeCookie(request: Request) {
  return request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(`${BRIDGE_COOKIE}=`))?.slice(BRIDGE_COOKIE.length + 1) ?? "";
}
export async function boundedJson(response: Response, limit = 524288): Promise<Record<string, unknown>> {
  const reader = response.body?.getReader(); if (!reader) throw new Error("empty_upstream_response");
  let size = 0, text = ""; const decoder = new TextDecoder();
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) { await reader.cancel(); throw new Error("upstream_response_too_large"); } text += decoder.decode(value, { stream: true }); }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  const body: unknown = JSON.parse(text);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid_upstream_response");
  return body as Record<string, unknown>;
}
export function upstream(serverUrl: string, path: "/api/admin/login" | "/api/admin/status" | "/api/admin/invites" | "/api/admin/logout", token?: string, body?: unknown) {
  return fetch(serverUrl + path, { method: body === undefined ? "GET" : "POST", redirect: "error", signal: AbortSignal.timeout(8000), cache: "no-store", headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(token ? { Cookie: `hpx_admin=${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
}
export function summarizeSync(body: Record<string, unknown>, serverUrl: string, loaderUrl: string | null): SyncState {
  const numeric = (value: unknown) => { if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("invalid_upstream_metrics"); return value; };
  if (body.protocol !== 2 || !Array.isArray(body.sessions) || !Array.isArray(body.rooms)) throw new Error("invalid_upstream_protocol");
  const rooms = body.rooms.slice(0, 1000).map((room: unknown) => {
    if (!room || typeof room !== "object" || !("id" in room) || typeof room.id !== "string" || room.id.length > 160) throw new Error("invalid_upstream_room");
    const r = room as Record<string, unknown>;
    return { id: room.id, participants: numeric(r.participants), effects: numeric(r.effects), sequence: numeric(r.sequence) };
  });
  return { status: "connected", serverUrl, loaderUrl, rooms, metrics: { participants: body.sessions.length, rooms: rooms.length, effects: numeric(body.effects), eventsReceived: numeric(body.eventsReceived), eventsDistributed: numeric(body.eventsDistributed), renderAcknowledgements: numeric(body.renderAcknowledgements), latency: body.latency === null ? null : numeric(body.latency) } };
}
