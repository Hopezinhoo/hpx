import { env } from "cloudflare:workers";
import { requireChatGPTUser, chatGPTSignOutPath } from "./chatgpt-auth";
import { isOwner } from "@/lib/access";
import Dashboard from "./presence-dashboard";

export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await requireChatGPTUser("/");
  if (!isOwner(user, env.HPX_OWNER_EMAIL)) {
    return <main className="access-page"><div className="brand-word">HPX<span>●</span></div><h1>Acesso reservado.</h1><p>Este painel de presença pertence ao administrador do HPX.</p><a className="primary-button" href={chatGPTSignOutPath("/")} target="_top">Trocar de conta</a></main>;
  }
  return <Dashboard signOutUrl={chatGPTSignOutPath("/")} loaderUrl={env.HPX_INGEST_URL ? `${env.HPX_INGEST_URL.replace(/\/$/, "")}/api/presence/loader` : undefined} />;
}
