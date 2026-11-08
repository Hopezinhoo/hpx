import { env } from "cloudflare:workers";
import { requireHpxUser, signOutPath, isHpxOwner } from "./hpx-auth";
import Dashboard from "./presence-dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireHpxUser("/");
  if (!isHpxOwner(user)) {
    return <main className="access-page"><div className="brand-word">HPX<span>●</span></div><h1>Acesso reservado.</h1><p>Este painel de presença pertence ao administrador do HPX.</p><a className="primary-button" href={signOutPath(user, "/")}>Sair</a></main>;
  }
  return <Dashboard signOutUrl={signOutPath(user, "/")} loaderUrl={env.HPX_INGEST_URL ? `${env.HPX_INGEST_URL.replace(/\/$/, "")}/api/presence/loader` : undefined} />;
}
