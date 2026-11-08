"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowUpRight, Check, Copy, Ellipsis, Gamepad2 } from "lucide-react";
import type { PresenceUser } from "@/lib/presence";

function GameArtwork({ src }: { src?: string | null }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!src || failedSource !== src || attempt >= 2) return;
    const timer = setTimeout(() => { setAttempt(value => value + 1); setFailedSource(null); }, 30_000);
    return () => clearTimeout(timer);
  }, [src, failedSource, attempt]);
  const imageSource = src && attempt ? `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}` : src;
  return <span className="game-art" aria-hidden="true"><Gamepad2 size={27} />{src && failedSource !== src && <img src={imageSource ?? undefined} alt="" width={150} height={150} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedSource(src)} />}</span>;
}

export function PresencePlayerCard({ user, lastSeenLabel, lastSeenDate, copied, onCopy }: {
  user: PresenceUser; lastSeenLabel: string; lastSeenDate: string; copied: boolean; onCopy: () => void;
}) {
  const hasGame = user.online && !!user.placeId;
  const gameName = user.gameName || `Jogo ${user.placeId}`;
  return <li className={`player-card ${user.online ? "is-online" : "is-offline"}`}>
    <div className="player-top">
      <span className="player-avatar" style={{ "--player-hue": Number(user.userId.slice(-4)) % 360 } as CSSProperties} aria-hidden="true">{Array.from(user.displayName).slice(0, 2).join("").toUpperCase()}</span>
      <div className="player-names"><h2 title={user.displayName}>{user.displayName}</h2><span title={`@${user.username}`}>@{user.username}</span></div>
      <span className={`player-status ${user.online ? "online" : "offline"}`}><span />{user.online ? "Online" : "Offline"}</span>
      <details className="player-menu" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false; }} onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
        <summary aria-label={`Opções de ${user.username}`} title="Opções do jogador"><Ellipsis size={18} /></summary>
        <div className="player-menu-content">
          <button onClick={onCopy}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "ID copiado!" : "Copiar ID"}</button>
          <a href={`https://www.roblox.com/users/${user.userId}/profile`} target="_blank" rel="noopener noreferrer">Perfil Roblox<ArrowUpRight size={15} /></a>
          <small>ID {user.userId}<br />Visto {lastSeenLabel}<br />{lastSeenDate}</small>
        </div>
      </details>
    </div>
    {hasGame ? <a className="player-game" href={`https://www.roblox.com/games/${user.placeId}`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${gameName} no Roblox`}>
      <GameArtwork key={user.placeId} src={user.gameImageUrl} /><strong title={gameName}>{gameName}</strong><ArrowUpRight className="game-arrow" size={18} />
    </a> : <div className="player-game game-empty"><GameArtwork /><span><strong>{user.online ? "Jogo não informado" : "Sem jogo agora"}</strong>{!user.online && <small>Visto {lastSeenLabel}</small>}</span></div>}
  </li>;
}
