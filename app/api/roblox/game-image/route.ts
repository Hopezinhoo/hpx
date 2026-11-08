import { loadGameImage } from "@/lib/roblox-images";

// Public Roblox artwork only. The Site's existing owner-only gate protects this route.
export function GET(request: Request) {
  return loadGameImage(new URL(request.url).searchParams.get("placeId") ?? "");
}
