import { clearSessionCookie } from "@/app/hpx-auth";

export async function GET(request: Request) {
  const response = new Response(null, { status: 303, headers: { Location: new URL("/login", request.url).toString(), "Cache-Control": "no-store" } });
  response.headers.append("Set-Cookie", clearSessionCookie());
  return response;
}

export const POST = GET;
