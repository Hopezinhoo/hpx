import { clearSessionCookie } from "@/app/hpx-auth";

export async function GET(request: Request) {
  const response = Response.redirect(new URL("/login", request.url), 303);
  response.headers.append("Set-Cookie", clearSessionCookie());
  return response;
}

export const POST = GET;
