export type PortalPreferences = { color: string; size: number; duration: number };
export const defaultPortal: PortalPreferences = { color: "#00FF66", size: 8, duration: 120 };
export function portalPreferences(input: unknown): PortalPreferences {
  const value = (input && typeof input === "object" ? input : {}) as Partial<PortalPreferences>;
  return {
    color: typeof value.color === "string" && /^#[0-9a-f]{6}$/i.test(value.color) ? value.color : defaultPortal.color,
    size: typeof value.size === "number" && Number.isFinite(value.size) ? Math.round(Math.min(24, Math.max(1, value.size))) : defaultPortal.size,
    duration: typeof value.duration === "number" && Number.isFinite(value.duration) ? Math.round(Math.min(300, Math.max(1, value.duration))) : defaultPortal.duration,
  };
}
export function syncSnippet(serverUrl: string, loaderUrl: string, invite: string, preferences: PortalPreferences, integrated=false) {
  for (const url of [serverUrl, loaderUrl]) { const parsed = new URL(url); if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("invalid_url"); }
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(invite)) throw new Error("invalid_invite");
  const p = portalPreferences(preferences);
  return `-- Adicione depois do carregamento do painel HPX.
local HPX = loadstring(game:HttpGet(${JSON.stringify(loaderUrl)}))()
local environment = (getgenv and getgenv()) or _G
if environment.HPXSync then
    pcall(function() environment.HPXSync:Stop() end)
end
local sync = HPX.new({
    BaseUrl = ${JSON.stringify(serverUrl)},
    InviteCode = ${JSON.stringify(invite)},
    DisableWebSocket = ${integrated?"true":"false"},
})
local ok, err = sync:Connect()
if not ok then warn("[HPX]", err); sync:Stop(); return end
environment.HPXSync = sync
environment.HPXPortal = function(properties)
    return sync:CreatePortal(properties or {
        color = "${p.color}", size = ${p.size}, duration = ${p.duration},
    })
end
-- Botão de portal: environment.HPXPortal()
-- Ao destruir o painel: sync:Stop()`;
}
