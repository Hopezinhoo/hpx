"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Pause, Play, Volume2 } from "lucide-react";
import { enableLofiAutoplay } from "@/lib/lofi-autoplay";

export function LofiPlayer() {
  const audio = useRef<HTMLAudioElement>(null);
  const stopAutoplay = useRef<(() => void) | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.18);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = audio.current;
    let saved = 0.18;
    try {
      const value = localStorage.getItem("hpx-lofi-volume");
      if (value !== null && Number.isFinite(Number(value))) saved = Math.min(1, Math.max(0, Number(value)));
    } catch { /* The player also works without browser storage. */ }
    setVolume(saved);
    if (element) {
      element.volume = saved;
      stopAutoplay.current = enableLofiAutoplay(element, document, event => event.target instanceof Element && !!event.target.closest(".lofi-toggle"));
    }
    return () => { stopAutoplay.current?.(); stopAutoplay.current = null; element?.pause(); };
  }, []);

  const toggle = async () => {
    const element = audio.current;
    if (!element) return;
    stopAutoplay.current?.();
    if (loading || !element.paused) { element.pause(); setLoading(false); return; }
    setFailed(false);
    setLoading(true);
    try { if (element.error) element.load(); await element.play(); }
    catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError")) setFailed(true); setPlaying(false); }
    finally { setLoading(false); }
  };

  const changeVolume = (value: number) => {
    setVolume(value);
    if (audio.current) audio.current.volume = value;
    try { localStorage.setItem("hpx-lofi-volume", String(value)); } catch { /* Optional preference. */ }
  };

  return <div className={`lofi-player ${playing ? "is-playing" : ""}`}>
    <audio ref={audio} src="/audio/hpx-lofi.mp3" loop preload="auto" onPlay={() => setPlaying(true)} onPause={() => { setPlaying(false); setLoading(false); }} onError={() => { stopAutoplay.current?.(); setFailed(true); setLoading(false); setPlaying(false); }} />
    <button className="lofi-toggle" onClick={toggle} aria-label={playing || loading ? "Pausar música lo-fi" : "Tocar música lo-fi"} aria-pressed={playing} title={failed ? "Não carregou. Clique para tentar de novo." : "Lo-fi HPX · trilha original"}>
      {loading ? <LoaderCircle size={16} className="spinning" /> : playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      <span>{failed ? "Tentar de novo" : "Lo-fi"}</span>
      {playing && <span className="lofi-equalizer" aria-hidden="true"><i /><i /><i /></span>}
    </button>
    <span className="lofi-divider" />
    <Volume2 size={14} aria-hidden="true" />
    <input type="range" min="0" max="1" step="0.01" value={volume} onChange={event => changeVolume(Number(event.target.value))} aria-label="Volume da música" aria-valuetext={`${Math.round(volume * 100)}%`} />
  </div>;
}
