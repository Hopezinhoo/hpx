import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";
import { getChatGPTUser, type ChatGPTUser } from "./chatgpt-auth";
import { isOwner } from "@/lib/access";

const SESSION_COOKIE = "hpx_admin_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export type HpxUser = ChatGPTUser & { authMethod: "chatgpt" | "password" };

function toBase64Url(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function cookieFromRequest(request: Request): string | null {
  const cookies = request.headers.get("cookie") ?? "";
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

async function sessionFromCookie(value: string | null): Promise<HpxUser | null> {
  const secret = env.HPX_ADMIN_PASSWORD?.trim();
  if (!secret || !value) return null;
  const [expires, signature] = value.split(".");
  const expiresAt = Number(expires);
  if (!/^\d+$/.test(expires) || !signature || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
  if (!safeEqual(await sign(expires, secret), signature)) return null;
  const email = env.HPX_OWNER_EMAIL?.trim() || "admin@hpx.local";
  return { userId: `hpx-password-${signature.slice(0, 16)}`, displayName: "HPX Admin", email, fullName: "HPX Admin", authMethod: "password" };
}

export async function getHpxUser(request?: Request): Promise<HpxUser | null> {
  const chatGPTUser = await getChatGPTUser();
  if (chatGPTUser) return { ...chatGPTUser, authMethod: "chatgpt" };
  const value = request ? cookieFromRequest(request) : (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  return sessionFromCookie(value);
}

export function isHpxOwner(user: HpxUser | null): boolean {
  return Boolean(user && (user.authMethod === "password" || isOwner(user, env.HPX_OWNER_EMAIL)));
}

export async function requireHpxUser(returnTo = "/"): Promise<HpxUser> {
  const user = await getHpxUser();
  if (user) return user;
  redirect(`/login?return_to=${encodeURIComponent(returnTo)}`);
}

export function signOutPath(user: HpxUser | null, returnTo = "/"): string {
  if (user?.authMethod === "chatgpt") return `/signout-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`;
  return `/api/auth/logout?return_to=${encodeURIComponent(returnTo)}`;
}

export async function validatePassword(password: string): Promise<boolean> {
  const configured = env.HPX_ADMIN_PASSWORD?.trim();
  return Boolean(configured && password.length === configured.length && safeEqual(password, configured));
}

export async function createSessionCookie(): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const signature = await sign(String(expiresAt), env.HPX_ADMIN_PASSWORD!.trim());
  return `${SESSION_COOKIE}=${expiresAt}.${signature}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
