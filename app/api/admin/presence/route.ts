import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { isOwner } from "@/lib/access";
import { listPresence } from "@/lib/presence";
import type { PresenceSnapshot } from "@/lib/presence";
import { withGameImages } from "@/lib/roblox-images";
import { json } from "@/lib/presence-http";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: "Entre na sua conta para continuar." }, 401);
  if (!isOwner(user, env.HPX_OWNER_EMAIL)) return json({ error: "Acesso restrito ao proprietário." }, 403);
  try {
    const params = new URL(request.url).searchParams;
    if (env.HPX_INGEST_URL && env.HPX_ADMIN_SECRET) {
      const response = await fetch(`${env.HPX_INGEST_URL}/api/internal/presence?${params}`, { headers: { Authorization: `Bearer ${env.HPX_ADMIN_SECRET}` }, cache: "no-store" });
      if (!response.ok) return json({ error: "O coletor de presença está indisponível." }, 503);
      const snapshot = await response.json() as PresenceSnapshot;
      return json({ ...snapshot, users: await withGameImages(snapshot.users), ingestEnabled: true });
    }
    if (!env.DB) return json({ error: "Armazenamento indisponível." }, 503);
    const snapshot = await listPresence(env.DB, { q: params.get("q") ?? "", status: params.get("status") ?? "all", page: Number(params.get("page")) });
    return json({ ...snapshot, users: await withGameImages(snapshot.users), ingestEnabled: env.HPX_INGEST_ENABLED === "true" });
  } catch { return json({ error: "Não foi possível atualizar a presença." }, 503); }
}
