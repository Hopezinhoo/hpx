import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

export default function Login() {
  const configured = Boolean(env.HPX_ADMIN_PASSWORD);
  return (
    <main className="hpx-login-page">
      <section className="hpx-login-card" aria-labelledby="login-title">
        <div className="hpx-login-logo">HPX</div>
        <h1 id="login-title">Login</h1>
        <p className="hpx-login-subtitle">Entre no painel HPX</p>
        <form className="hpx-login-form" action="/api/auth/login" method="post">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" value={env.HPX_OWNER_EMAIL || ""} readOnly autoComplete="username" />
          <label htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" placeholder="Digite sua senha" autoComplete="current-password" required disabled={!configured} />
          <input type="hidden" name="return_to" value="/" />
          <div className="hpx-login-options">
            <label><input type="checkbox" name="remember" defaultChecked /> <span>Lembrar de mim</span></label>
            <a href="mailto:hopezinhoo@gmail.com?subject=Recuperar%20senha%20HPX">Esqueci a senha</a>
          </div>
          {!configured && <p className="hpx-login-warning">A senha ainda não foi configurada no Worker.</p>}
          <button className="hpx-login-submit" type="submit" disabled={!configured}>Entrar</button>
        </form>
        <p className="hpx-login-footer">Painel privado de <strong>{env.HPX_ADMIN_NAME || "HPX"}</strong></p>
      </section>
    </main>
  );
}
