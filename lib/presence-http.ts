import { env } from "cloudflare:workers";
import { endSession, heartbeat, PresenceError, rateLimit, startSession } from "./presence";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

async function readSmallJson(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new PresenceError(415, "Use JSON.");
  if (Number(request.headers.get("content-length")) > 1024) throw new PresenceError(413, "Dados muito grandes.");
  const reader = request.body?.getReader();
  if (!reader) throw new PresenceError(400, "Dados ausentes.");
  let size = 0, body = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1024) { await reader.cancel(); throw new PresenceError(413, "Dados muito grandes."); }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally { reader.releaseLock(); }
  try { return JSON.parse(body); } catch { throw new PresenceError(400, "JSON inválido."); }
}

export async function presenceRequest(request: Request, action: "start" | "heartbeat" | "end") {
  try {
    if (env.HPX_INGEST_ENABLED !== "true") return json({ error: "Conexão dos painéis ainda não ativada." }, 503);
    if (!env.DB) return json({ error: "Serviço indisponível." }, 503);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return json({ error: "Origem não permitida." }, 403);
    const body = await readSmallJson(request);
    const token = request.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1] ?? "";
    const client = request.headers.get("cf-connecting-ip") ?? "local";
    await rateLimit(env.DB, client, action, action === "start" ? 10 : 300);
    if (action === "start") return json(await startSession(env.DB, body), 201);
    return json(action === "heartbeat" ? await heartbeat(env.DB, token) : await endSession(env.DB, token));
  } catch (error) {
    return error instanceof PresenceError ? json({ error: error.message }, error.status) : json({ error: "Serviço temporariamente indisponível." }, 503);
  }
}
