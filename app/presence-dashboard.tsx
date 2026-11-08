"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Check, ChevronLeft, ChevronRight, Copy, Gamepad2, LogOut, Radio, RefreshCw, Search, Settings2, Sparkles, X } from "lucide-react";
import type { PresenceSnapshot } from "@/lib/presence";
import { PresencePlayerCard } from "@/components/presence-player-card";
import { BackgroundMusic } from "@/components/background-music";
import { animeOpenings } from "@/lib/anime-playlist";
import { SkyCompanions } from "@/components/sky-companions";
import { ShootingStars } from "@/components/shooting-stars";
import { HPXSyncPanel, HPXSyncSettings, useHPXSync } from "@/components/hpx-sync-panel";

function relative(time: number, now: number) {
  const seconds = Math.max(0, Math.floor((now - time) / 1000));
  if (seconds < 60) return "agora mesmo";
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `há ${Math.floor(seconds / 3600)} h`;
  return `há ${Math.floor(seconds / 86400)} dias`;
}
const date = (time: number) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(time);

export default function Dashboard({ signOutUrl, loaderUrl }: { signOutUrl: string; loaderUrl?: string }) {
  const [data, setData] = useState<PresenceSnapshot | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [setup, setSetup] = useState(false);
  const [view,setView] = useState<"players"|"sync">("players");
  const [setupTab,setSetupTab] = useState<"panel"|"sync">("panel");
  const sync = useHPXSync(view === "sync" || (setup && setupTab === "sync"));
  const [copied, setCopied] = useState("");
  const [now, setNow] = useState(Date.now());
  const [origin, setOrigin] = useState("");
  const abort = useRef<AbortController | null>(null);
  const setupButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => {
    const updateCategory = () => setView(window.location.hash === "#hpx-sync" ? "sync" : "players");
    updateCategory();
    window.addEventListener("hashchange", updateCategory);
    return () => window.removeEventListener("hashchange", updateCategory);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(query); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const refresh = useCallback(async () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    try {
      const params = new URLSearchParams({ q: search, status: filter, page: String(page) });
      const response = await fetch(`/api/admin/presence?${params}`, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "Sua sessão terminou. Entre novamente." : "Não foi possível atualizar os jogadores.");
      const snapshot = await response.json() as PresenceSnapshot;
      setData(snapshot); setNow(snapshot.serverTime); setError("");
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Falha de conexão.");
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }, [search, filter, page]);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => { if (!document.hidden) refresh(); }, 10_000);
    const visible = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); abort.current?.abort(); document.removeEventListener("visibilitychange", visible); };
  }, [refresh]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!setup) return;
    closeButton.current?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; setupButton.current?.focus(); };
  }, [setup]);

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1800); }
    catch { setError("Não foi possível copiar. Tente novamente."); }
  };
  const clearFilters = () => { setQuery(""); setFilter("all"); setPage(1); };
  const snippet = `local hpxPresence = loadstring(game:HttpGet("${loaderUrl || `${origin}/presence.lua`}"))()`;
  const pages = data ? Math.max(1, Math.ceil(data.totalResults / data.pageSize)) : 1;
  const filtered = !!search || filter !== "all";
  const switchCategory = () => {
    const next = view === "players" ? "sync" : "players";
    setView(next);
    window.location.hash = next === "sync" ? "hpx-sync" : "jogadores";
  };

  return <div className="app-shell">
    <ShootingStars />
    <header className="site-header">
      <a className="brand" href="/" aria-label="HPX, início">HPX<span aria-hidden="true">✦</span></a>
      <SkyCompanions />
      <div className="header-actions">
        <BackgroundMusic />
        <button type="button" className="icon-button sync-category-toggle" aria-label="HPX Sync" title={view === "players" ? "Abrir HPX Sync" : "Voltar para jogadores"} aria-pressed={view === "sync"} aria-controls="dashboard-category" onClick={switchCategory}><Radio size={20} aria-hidden="true" /></button>
        <button ref={setupButton} className="icon-button" aria-label="Configurações do painel" title="Configurações do painel" aria-haspopup="dialog" aria-expanded={setup} onClick={() => {setSetupTab(view === "sync" ? "sync" : "panel");setSetup(true);}}><Settings2 size={20} /></button>
        <a className="icon-button" href={signOutUrl} target="_top" aria-label="Sair da conta" title="Sair da conta"><LogOut size={20} /></a>
      </div>
    </header>

    <main id="dashboard-category" className="dashboard" aria-labelledby="players-title">
      <div className="page-heading">
        <h1 id="players-title">{view === "players" ? "Sua galera" : "HPX Sync"}<Sparkles size={26} aria-hidden="true" /></h1>
        <span className="online-count" aria-label={data ? `${data.stats.online} jogadores online no HPX` : "Carregando presença"}><span />{data ? `${data.stats.online} online` : "Conectando…"}</span>
      </div>

      {view === "players" && error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={refresh}>Tentar de novo</button></div>}

      {view === "players" && <section className="users-panel" aria-label="Jogadores">
        <div className="toolbar">
          <div className="tabs" aria-label="Filtrar jogadores">
            {[["all", "Todos"], ["online", "Online"], ["offline", "Offline"]].map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? "selected" : ""} onClick={() => { setFilter(value); setPage(1); }}>{label}</button>)}
          </div>
          <div className="search-tools">
            <label className="search"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar jogador…" aria-label="Buscar por nome ou UserId" maxLength={80} />{query && <button aria-label="Limpar busca" onClick={() => setQuery("")}><X size={15} /></button>}</label>
            <button className="icon-button refresh-button" aria-label="Atualizar jogadores" title={data ? `Atualizado ${relative(data.serverTime, now)}` : "Atualizar"} onClick={refresh} disabled={busy}><RefreshCw size={18} className={busy ? "spinning" : ""} /></button>
          </div>
        </div>

        {data && data.users.length > 0 && <ul className="player-list" aria-label="Jogadores do HPX" aria-busy={busy}>
          {data.users.map(user => <PresencePlayerCard key={user.userId} user={user} lastSeenLabel={relative(user.lastSeen, now)} lastSeenDate={date(user.lastSeen)} copied={copied === user.userId} onCopy={() => copy(user.userId, user.userId)} />)}
        </ul>}
        {!data && !error && <div className="empty-state" role="status"><RefreshCw size={28} className="spinning" /><h2>Chamando a galera…</h2></div>}
        {data && data.users.length === 0 && <div className="empty-state"><span className="empty-sticker"><Gamepad2 size={34} /></span><h2>{filtered ? "Ninguém por aqui." : "Sua galera aparece aqui."}</h2><p>{filtered ? "Tente outro nome ou filtro." : "Conecte o painel para começar."}</p><button className="secondary-button" onClick={filtered ? clearFilters : () => setSetup(true)}>{filtered ? "Limpar filtros" : "Conectar painel"}</button></div>}
        {pages > 1 && <nav className="pagination" aria-label="Páginas de jogadores"><button className="icon-button" disabled={page <= 1} onClick={() => setPage(value => value - 1)} aria-label="Página anterior"><ChevronLeft size={18} /></button><span>{page} de {pages}</span><button className="icon-button" disabled={page >= pages} onClick={() => setPage(value => value + 1)} aria-label="Próxima página"><ChevronRight size={18} /></button></nav>}
      </section>}
      {view === "sync" && <HPXSyncPanel control={sync} onSettings={()=>{setSetupTab("sync");setSetup(true);}}/>}
    </main>

    {setup && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSetup(false); }}>
      <section className="setup-dialog" role="dialog" aria-modal="true" aria-labelledby="setup-title" onKeyDown={event => {
        if (event.key === "Escape") setSetup(false);
        if (event.key === "Tab") {
          const elements = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], summary, input:not(:disabled), select:not(:disabled)');
          const first = elements[0], last = elements[elements.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
        <button ref={closeButton} className="icon-button dialog-close" aria-label="Fechar configuração" onClick={() => setSetup(false)}><X size={20} /></button>
        <span className="dialog-sticker"><Gamepad2 size={28} /></span>
        <h2 id="setup-title">Configurações</h2>
        <div className="settings-tabs" aria-label="Configurações"><button className={setupTab === "panel" ? "selected" : ""} aria-pressed={setupTab === "panel"} onClick={()=>setSetupTab("panel")}>Conectar painel</button><button className={setupTab === "sync" ? "selected" : ""} aria-pressed={setupTab === "sync"} onClick={()=>setSetupTab("sync")}>HPX Sync</button></div>
        {setupTab === "sync" ? <HPXSyncSettings control={sync}/> : <>
        <p>Copie esta linha para o início do seu loader.</p>
        {data && !data.ingestEnabled && <p className="install-notice">O recebimento de presença ainda precisa ser ativado.</p>}
        <div className="code-block"><pre>{snippet}</pre><button className="secondary-button" disabled={!loaderUrl && !origin} onClick={() => copy(snippet, "loader")}>{copied === "loader" ? <Check size={15} /> : <Copy size={15} />}{copied === "loader" ? "Copiado!" : "Copiar"}</button></div>
        <a className="download-link" href="/presence.lua" download="presence.lua"><ArrowDownToLine size={15} />Baixar script</a>
        <details className="about-presence"><summary>Sobre o painel</summary><p>A presença acompanha o script do HPX. Após 90 segundos sem sinal, o jogador fica offline. Nomes e jogos são informados pelo script.</p><p>O ícone de música pausa e retoma o áudio. As versões de anime tocam em ordem aleatória pelo Audius. Se o navegador bloquear o som automático, a primeira interação permitida tenta iniciá-lo.</p></details>
        <details className="about-presence music-credits"><summary>Créditos das músicas</summary><ul>{animeOpenings.map(track => <li key={track.id}><a href={track.url} target="_blank" rel="noopener noreferrer">{track.title}</a><span>© {track.publisher} · via Audius</span></li>)}</ul><p>Streaming pela API do Audius, conforme a <a href="https://audius.org/open-music-license.pdf" target="_blank" rel="noopener noreferrer">Audius Open Music License</a>.</p></details></>}
      </section>
    </div>}
  </div>;
}
