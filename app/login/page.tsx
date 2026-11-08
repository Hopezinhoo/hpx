import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

export default function Login() {
  const configured = Boolean(env.HPX_ADMIN_PASSWORD);
  return (
    <main className="access-page">
      <div className="brand-word">HPX<span>●</span></div>
      <h1>Entrar no HPX</h1>
      <p>{configured ? "Use a senha administrativa do painel." : "A senha administrativa ainda não foi configurada no Worker."}</p>
      <form className="hpx-login-form" action="/api/auth/login" method="post">
        <label htmlFor="password">Senha do HPX</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required disabled={!configured} />
        <input type="hidden" name="return_to" value="/" />
        <button className="primary-button" type="submit" disabled={!configured}>Entrar</button>
      </form>
    </main>
  );
}
