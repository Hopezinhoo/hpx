import { env } from "cloudflare:workers";
import { getHpxUser } from "@/app/hpx-auth";
import { isHpxOwner as isOwner } from "@/app/hpx-auth";
import { json } from "@/lib/presence-http";
import { boundedJson, bridgeCookie, openBridge, readBridgeCookie, sealBridge, summarizeSync, syncOrigin, upstream, type BridgeSession } from "@/lib/hpx-sync";

export const dynamic = "force-dynamic";
async function integrated(request:Request) {
  if(env.HPX_SYNC_URL)return null;
  const user=await getHpxUser(request);
  if(!user)return json({error:"Entre na sua conta para continuar."},401);
  if(!isOwner(user,env.HPX_OWNER_EMAIL))return json({error:"Acesso restrito ao proprietário."},403);
  if(request.method!=="GET"&&request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Origem não permitida."},403);
  const serverUrl=syncOrigin(env.HPX_INGEST_URL);
  if(!serverUrl||!env.HPX_ADMIN_SECRET)return json({status:"unconfigured",serverUrl:null,loaderUrl:null,integrated:true,message:"O serviço de presença ainda precisa ser conectado a este site."});
  let input:Record<string,unknown>|undefined;
  if(request.method!=="GET"){
    if(!request.headers.get("content-type")?.startsWith("application/json"))return json({error:"Use JSON."},415);
    input=await boundedJson(new Response(request.body),1024);
    if(input.action!=="invite"&&!(input.action==="configure"&&typeof input.enabled==="boolean"))return json({error:"Ação inválida."},400);
  }
  const response=await fetch(`${serverUrl}/api/internal/sync`,{method:input?"POST":"GET",redirect:"error",signal:AbortSignal.timeout(8000),cache:"no-store",headers:{Authorization:`Bearer ${env.HPX_ADMIN_SECRET}`,...(input?{"Content-Type":"application/json"}:{})},body:input?JSON.stringify(input):undefined});
  if(!response.ok)return json({error:"O serviço Sync integrado ainda não está disponível.",status:"unavailable",serverUrl,loaderUrl:null,integrated:true},503);
  const data=await boundedJson(response);
  if(input?.action==="invite"){
    if(typeof data.code!=="string"||!/^[a-f0-9]{64}$/.test(data.code)||typeof data.expiresAt!=="number"||!Number.isFinite(data.expiresAt))throw new Error("invalid_invite");
    return json({code:data.code,expiresAt:data.expiresAt});
  }
  const summary=summarizeSync(data,serverUrl,`${serverUrl}/hpx-sync.lua`);
  return json({...summary,status:data.enabled===true?"connected":"disabled",integrated:true,message:data.enabled===true?undefined:"Ative o HPX Sync nas configurações para começar."});
}
async function context(request: Request) {
  const user = await getHpxUser(request);
  if (!user) return { response: json({ error: "Entre na sua conta para continuar." }, 401) };
  if (!isOwner(user, env.HPX_OWNER_EMAIL)) return { response: json({ error: "Acesso restrito ao proprietário." }, 403) };
  if (request.method !== "GET" && request.headers.get("origin") !== new URL(request.url).origin) return { response: json({ error: "Origem não permitida." }, 403) };
  let serverUrl: string | null;
  try { serverUrl = syncOrigin(env.HPX_SYNC_URL); }
  catch { return { response: json({ status: "unavailable", serverUrl: null, loaderUrl: null, message: "O endereço do servidor Sync precisa ser corrigido." }) }; }
  const loaderUrl = env.HPX_INGEST_URL ? `${env.HPX_INGEST_URL.replace(/\/$/, "")}/hpx-sync.lua` : null;
  if (!serverUrl) return { response: json({ status: "unconfigured", serverUrl: null, loaderUrl, message: "O servidor HPX Sync ainda não foi vinculado a este site." }) };
  const secret = env.HPX_SYNC_BRIDGE_KEY || env.HPX_ADMIN_SECRET || "";
  if (secret.length < 24) return { response: json({ status: "unavailable", serverUrl, loaderUrl, message: "A conexão administrativa segura ainda precisa ser configurada." }) };
  const session = await openBridge(readBridgeCookie(request), secret, user.userId, serverUrl);
  return { user, serverUrl, loaderUrl, secret, session };
}
async function status(serverUrl: string, loaderUrl: string | null, session: BridgeSession | null) {
  if (!session) return json({ status: "needs_auth", serverUrl, loaderUrl, message: "Entre no servidor Sync para gerenciar as conexões." });
  const response = await upstream(serverUrl, "/api/admin/status", session.token);
  if (response.status === 401) {
    const result = json({ status: "needs_auth", serverUrl, loaderUrl, message: "A sessão do servidor Sync terminou. Conecte novamente." });
    result.headers.set("Set-Cookie", bridgeCookie("", 0)); return result;
  }
  if (!response.ok) throw new Error("upstream_unavailable");
  return json(summarizeSync(await boundedJson(response), serverUrl, loaderUrl));
}
export async function GET(request: Request) {
  try { const native=await integrated(request);if(native)return native;const ctx = await context(request); if (ctx.response) return ctx.response; return await status(ctx.serverUrl!, ctx.loaderUrl!, ctx.session!); }
  catch { return json({ status: "unavailable", serverUrl: null, loaderUrl: null, message: "Não foi possível alcançar o servidor HPX Sync." }); }
}
export async function POST(request: Request) {
  try {
    const native=await integrated(request);if(native)return native;
    const ctx = await context(request); if (ctx.response) return ctx.response;
    if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Use JSON." }, 415);
    const body = await boundedJson(new Response(request.body), 1024);
    const { serverUrl, loaderUrl, secret, user } = ctx;
    if (body.action === "connect") {
      if (typeof body.password !== "string" || body.password.length < 24 || body.password.length > 256) return json({ error: "Confira a senha administrativa do HPX Sync." }, 400);
      const response = await upstream(serverUrl!, "/api/admin/login", undefined, { password: body.password });
      if (!response.ok) return json({ error: response.status === 429 ? "Aguarde um minuto antes de tentar novamente." : "Não foi possível entrar no servidor Sync. Confira a senha." }, response.status === 429 ? 429 : 401);
      const cookies = response.headers.get("set-cookie") ?? "";
      const token = cookies.match(/(?:^|,\s*)hpx_admin=([A-Za-z0-9_-]{32,128})(?:;|$)/)?.[1];
      const maxAge = Math.max(1, Math.min(1800, Number(cookies.match(/Max-Age=(\d+)/i)?.[1]) || 1800));
      if (!token) throw new Error("invalid_upstream_cookie");
      const session = { token, serverUrl: serverUrl!, ownerId: user!.userId, expiresAt: Date.now() + maxAge * 1000 };
      const result = await status(serverUrl!, loaderUrl!, session);
      result.headers.set("Set-Cookie", bridgeCookie(await sealBridge(session, secret!), maxAge)); return result;
    }
    if (body.action === "disconnect") {
      if (ctx.session) { try { await upstream(serverUrl!, "/api/admin/logout", ctx.session.token, {}); } catch {} }
      const result = json({ status: "needs_auth", serverUrl, loaderUrl, message: "Conexão administrativa encerrada." });
      result.headers.set("Set-Cookie", bridgeCookie("", 0)); return result;
    }
    if (body.action === "invite") {
      if (!ctx.session) return json({ error: "Conecte ao servidor Sync novamente." }, 401);
      const response = await upstream(serverUrl!, "/api/admin/invites", ctx.session.token, {});
      if (!response.ok) return json({ error: response.status === 401 ? "Sua sessão Sync terminou. Conecte novamente." : "Não foi possível gerar o convite." }, response.status === 401 ? 401 : 503);
      const invitation = await boundedJson(response, 4096);
      if (typeof invitation.code !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(invitation.code) || typeof invitation.expiresAt !== "number" || !Number.isFinite(invitation.expiresAt)) throw new Error("invalid_invite");
      return json({ code: invitation.code, expiresAt: invitation.expiresAt });
    }
    return json({ error: "Ação inválida." }, 400);
  } catch { return json({ error: "Não foi possível completar a conexão com o HPX Sync." }, 503); }
}
