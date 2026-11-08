export const animeOpenings = [
  { id: "JbBJz", anime: "Jujutsu Kaisen", title: "Kaikai Kitan (shirobeats remix)", publisher: "shirobeats", url: "https://audius.co/shirobeats/jujutsu-kaisen-kaikai-kitan-shirobeats-remix-360007" },
  { id: "l41MK", anime: "Dragon Maid S", title: "Ai No Supreme (shirobeats & NOIZZ. Remix)", publisher: "shirobeats & NOIZZ.", url: "https://audius.co/shirobeats/dragon-maid-s-ai-no-supreme-shirobeats-noizz.-remix-" },
  { id: "1j1Kr", anime: "No Game No Life", title: "No Game No Life", publisher: "shirobeats, None Like Joshua & Iron Mouse", url: "https://audius.co/shirobeats/no-game-no-life-w-none-like-joshua-iron-mouse-218441" },
] as const;

export type AnimeOpening = (typeof animeOpenings)[number];

// Keep access checks and CDN redirects under the provider's control. Do not
// save expiring media URLs or copy the audio into the site's own storage.
export function animeStreamUrl(track: AnimeOpening) {
  return `https://api.audius.co/v1/tracks/${encodeURIComponent(track.id)}/stream?app_name=HPXPresence`;
}

export function createAnimeQueue(random = Math.random, previousTrackId = "") {
  let remaining: AnimeOpening[] = [];
  let previous = previousTrackId;
  return {
    next(): AnimeOpening {
      if (!remaining.length) {
        remaining = [...animeOpenings];
        for (let i = remaining.length - 1; i > 0; i--) {
          const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
          [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        if (remaining.length > 1 && remaining[0].id === previous) [remaining[0], remaining[1]] = [remaining[1], remaining[0]];
      }
      const track = remaining.shift()!;
      previous = track.id;
      return track;
    },
  };
}
