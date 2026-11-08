"use client";

import { useEffect, useRef, useState } from "react";
import { Music2 } from "lucide-react";
import { animeOpenings, animeStreamUrl, createAnimeQueue } from "@/lib/anime-playlist";
import type { AnimeOpening } from "@/lib/anime-playlist";
import { enableLofiAutoplay } from "@/lib/lofi-autoplay";

const lastTrackKey = "hpx-anime-last-track";

export function BackgroundMusic() {
  const audio = useRef<HTMLAudioElement>(null);
  const togglePlayback = useRef<() => void>(() => {});
  const [track, setTrack] = useState<AnimeOpening | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    let previousTrack = "";
    try { previousTrack = localStorage.getItem(lastTrackKey) ?? ""; }
    catch { /* Audio also works when browser storage is unavailable. */ }
    const queue = createAnimeQueue(Math.random, previousTrack);
    let disposed = false;
    let wantsPlayback = true;
    let failures = 0;
    let generation = 0;
    let cancelAutoplay = () => {};
    element.volume = 0.18;

    const stopRequests = () => {
      generation++;
      cancelAutoplay();
      cancelAutoplay = () => {};
    };
    const start = () => {
      stopRequests();
      if (disposed || document.hidden || !wantsPlayback) return;
      element.autoplay = true;
      cancelAutoplay = enableLofiAutoplay({
        play: () => {
          const request = generation;
          setLoading(true);
          // play() runs directly inside the allowed gesture if autoplay is blocked.
          return element.play().finally(() => {
            if (!disposed && request === generation) setLoading(false);
          });
        },
      }, document, event => event.target instanceof Element && !!event.target.closest(".music-toggle"));
    };
    const selectNext = () => {
      stopRequests();
      const next = queue.next();
      try { localStorage.setItem(lastTrackKey, next.id); }
      catch { /* Track memory is optional; playback must still work. */ }
      setTrack(next);
      setFailed(false);
      setPlaying(false);
      setLoading(false);
      element.autoplay = wantsPlayback && !document.hidden;
      element.src = animeStreamUrl(next);
      element.load();
    };
    const onPlaying = () => {
      if (disposed) return;
      failures = 0;
      setPlaying(true);
      setLoading(false);
      setFailed(false);
    };
    const onPause = () => {
      if (disposed) return;
      setPlaying(false);
      setLoading(false);
    };
    const onCanPlay = () => {
      if (!disposed && wantsPlayback && !document.hidden && element.paused) start();
    };
    const onEnded = () => {
      if (disposed) return;
      selectNext();
      start();
    };
    const onError = () => {
      if (disposed) return;
      stopRequests();
      setPlaying(false);
      setLoading(false);
      // Try each track at most once when the provider is unavailable.
      if (wantsPlayback && ++failures < animeOpenings.length) {
        selectNext();
        start();
      } else {
        wantsPlayback = false;
        element.autoplay = false;
        setFailed(true);
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stopRequests();
        element.autoplay = false;
        element.pause();
      } else if (wantsPlayback) start();
    };
    togglePlayback.current = () => {
      stopRequests();
      if (!element.paused) {
        wantsPlayback = false;
        element.autoplay = false;
        element.pause();
        setLoading(false);
        return;
      }
      wantsPlayback = true;
      failures = 0;
      if (element.error || element.ended) selectNext();
      start();
    };

    element.addEventListener("playing", onPlaying);
    element.addEventListener("canplay", onCanPlay);
    element.addEventListener("pause", onPause);
    element.addEventListener("ended", onEnded);
    element.addEventListener("error", onError);
    document.addEventListener("visibilitychange", onVisibility);
    selectNext();
    start();
    return () => {
      disposed = true;
      stopRequests();
      togglePlayback.current = () => {};
      document.removeEventListener("visibilitychange", onVisibility);
      element.removeEventListener("playing", onPlaying);
      element.removeEventListener("canplay", onCanPlay);
      element.removeEventListener("pause", onPause);
      element.removeEventListener("ended", onEnded);
      element.removeEventListener("error", onError);
      element.autoplay = false;
      element.pause();
      element.removeAttribute("src");
      element.load();
    };
  }, []);

  const label = failed ? "Música indisponível. Tentar novamente" : playing || loading ? "Pausar música" : "Tocar música";
  const title = track ? `${label} · ${track.title} · ${track.publisher} · Audius` : label;

  return <>
    <audio ref={audio} autoPlay preload="auto" hidden />
    <button type="button" className={`icon-button music-toggle${playing ? " is-playing" : ""}`} onClick={() => togglePlayback.current()}
      aria-label={label} title={title} aria-pressed={playing} aria-busy={loading || undefined}>
      <Music2 size={20} aria-hidden="true" />
    </button>
  </>;
}
