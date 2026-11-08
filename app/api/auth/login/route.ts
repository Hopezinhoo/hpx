import { env } from "cloudflare:workers";
import { createSessionCookie, validatePassword } from "@/app/hpx-auth";

function safeReturnTo(value: FormDataEntryValue | null): string {
  const path = typeof value === "string" ? value : "/";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export async function POST(request: Request) {
  if (!env.HPX_ADMIN_PASSWORD) return Response.redirect(new URL("/login?error=not-configured", request.url), 303);
  const form = await request.formData();
  const password = form.get("password");
  const returnTo = safeReturnTo(form.get("return_to"));
  if (typeof password !== "string" || !(await validatePassword(password))) return Response.redirect(new URL("/login?error=invalid", request.url), 303);
  const response = Response.redirect(new URL(returnTo, request.url), 303);
  response.headers.append("Set-Cookie", await createSessionCookie());
  return response;
}
