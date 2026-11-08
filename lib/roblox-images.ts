const CACHE_TTL_MS = 15 * 60_000;
const RETRY_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 500;
const IMAGE_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 512 * 1024;
const MAX_CACHED_IMAGES = 32;
const runtimeFetch: typeof fetch = (input, init) => globalThis.fetch(input, init);

function validPlaceId(value: string) {
  return /^[1-9][0-9]{0,15}$/.test(value) && Number.isSafeInteger(Number(value));
}

function trustedImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      && (url.hostname === "rbxcdn.com" || url.hostname.endsWith(".rbxcdn.com")) ? url.href : null;
  } catch { return null; }
}

export function createGameImageResolver(fetcher: typeof fetch = runtimeFetch, now = Date.now, reportError?: (detail: string) => void) {
  const cache = new Map<string, { url: string | null; expiresAt: number }>();
  return async (placeIds: string[]): Promise<Map<string, string | null>> => {
    const ids = [...new Set(placeIds.filter(validPlaceId))].slice(0, 40);
    const result = new Map<string, string | null>();
    const missing = ids.filter(id => {
      const saved = cache.get(id);
      if (saved && saved.expiresAt > now()) { result.set(id, saved.url); return false; }
      return true;
    });
    if (!missing.length) return result;

    // One public Roblox request for the whole page; failures never hide players.
    const resolved = new Map<string, string>();
    try {
      const params = new URLSearchParams({ placeIds: missing.join(","), returnPolicy: "PlaceHolder", size: "150x150", format: "Png", isCircular: "false" });
      const response = await fetcher(`https://thumbnails.roblox.com/v1/places/gameicons?${params}`, {
        signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS), redirect: "manual",
      });
      if (response.ok) {
        const payload = await response.json() as { data?: { targetId: number | string; state: string; imageUrl?: string }[] };
        if (Array.isArray(payload.data)) {
          for (const item of payload.data) {
            if (!item || item.state !== "Completed") continue;
            const id = String(item.targetId);
            const url = trustedImageUrl(item.imageUrl);
            if (missing.includes(id) && url) resolved.set(id, url);
          }
        }
      } else { reportError?.(`thumbnail_http_${response.status}`); }
    } catch (error) { reportError?.(error instanceof Error ? error.message.slice(0, 160) : "thumbnail_request_failed"); }

    for (const id of missing) {
      const url = resolved.get(id) ?? null;
      result.set(id, url);
      cache.set(id, { url, expiresAt: now() + (url ? CACHE_TTL_MS : RETRY_TTL_MS) });
    }
    while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
    return result;
  };
}

export function gameImagePath(placeId: string | null) {
  return placeId && validPlaceId(placeId) ? `/api/roblox/game-image?placeId=${placeId}` : null;
}

export function createGameImageLoader(fetcher: typeof fetch = runtimeFetch, now = Date.now) {
  const cache = new Map<string, { bytes: ArrayBuffer; contentType: string; expiresAt: number }>();
  let lookupError = "thumbnail_unavailable";
  const resolve = createGameImageResolver(fetcher, now, detail => { lookupError = detail; });
  const unavailable = (code: string, status = 503) => Response.json({ error: "Imagem do jogo indisponível.", code }, {
    status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
  const image = (bytes: ArrayBuffer, contentType: string) => new Response(bytes, {
    headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=900", "X-Content-Type-Options": "nosniff" },
  });
  return async (placeId: string): Promise<Response> => {
    if (!validPlaceId(placeId)) return unavailable("invalid_place_id", 400);
    const saved = cache.get(placeId);
    if (saved && saved.expiresAt > now()) return image(saved.bytes, saved.contentType);
    const url = (await resolve([placeId])).get(placeId);
    if (!url) return unavailable(lookupError);
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS), redirect: "manual" });
      if (!response.ok) return unavailable(`image_http_${response.status}`);
      const contentType = response.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "";
      if (!["image/png", "image/jpeg", "image/webp"].includes(contentType)) return unavailable("invalid_image_type");
      if (Number(response.headers.get("content-length")) > MAX_IMAGE_BYTES) return unavailable("image_too_large");
      const bytes = await response.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) return unavailable("invalid_image_size");
      cache.set(placeId, { bytes, contentType, expiresAt: now() + CACHE_TTL_MS });
      while (cache.size > MAX_CACHED_IMAGES) cache.delete(cache.keys().next().value!);
      return image(bytes, contentType);
    } catch { return unavailable("image_request_failed"); }
  };
}

export const loadGameImage = createGameImageLoader();

export async function withGameImages<T extends { online: boolean; placeId: string | null }>(users: T[]) {
  return users.map(user => ({ ...user, gameImageUrl: user.online ? gameImagePath(user.placeId) : null }));
}
