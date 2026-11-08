-- HPX Presence: load once at the beginning of the panel loader.
-- Sends player identity and the current Roblox place. No Roblox cookie or password.
-- Requires an HTTP request function supplied by the loader environment.
local API_BASE = "https://hpx-ingest-7f2a.gracildaalves8.chatgpt.site"
local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local MarketplaceService = game:GetService("MarketplaceService")
local environment = (getgenv and getgenv()) or _G
local previous = environment.HPX_Presence
if type(previous) == "table" and type(previous.Stop) == "function" then
    pcall(previous.Stop)
end

local sendRequest = (type(request) == "function" and request)
    or (type(http_request) == "function" and http_request)
    or (syn and type(syn.request) == "function" and syn.request)
local alive = true
local sessionToken
local connections = {}
local watchConnections = {}
local controller = { Status = "connecting" }
environment.HPX_Presence = controller

local function disconnect(list)
    for _, connection in ipairs(list) do connection:Disconnect() end
    table.clear(list)
end

local function post(path, body, token)
    if not sendRequest then return nil, 0 end
    local headers = { ["Content-Type"] = "application/json" }
    if token then headers.Authorization = "Bearer " .. token end
    local ok, response = pcall(sendRequest, {
        Url = API_BASE .. path,
        Method = "POST",
        Headers = headers,
        Body = HttpService:JSONEncode(body),
        Timeout = 10,
    })
    if not ok or type(response) ~= "table" then return nil, 0 end
    local code = tonumber(response.StatusCode or response.Status) or 0
    if code < 200 or code >= 300 then return nil, code end
    local parsed, data = pcall(HttpService.JSONDecode, HttpService, response.Body or "")
    if not parsed or type(data) ~= "table" then return nil, code end
    return data, code
end

function controller.Stop()
    if not alive then return end
    alive = false
    controller.Status = "stopped"
    disconnect(connections)
    disconnect(watchConnections)
    local token = sessionToken
    sessionToken = nil
    if environment.HPX_Presence == controller then environment.HPX_Presence = nil end
    if token then task.spawn(function() post("/api/presence/end", {}, token) end) end
end

function controller.BindGui(gui)
    if not alive or typeof(gui) ~= "Instance" or not gui:IsA("GuiObject") and not gui:IsA("ScreenGui") then return false end
    disconnect(watchConnections)
    table.insert(connections, gui.Destroying:Connect(controller.Stop))
    return true
end

if not sendRequest then
    controller.Status = "unsupported"
    alive = false
    return controller
end

task.spawn(function()
    local player = Players.LocalPlayer
    while alive and not player do task.wait(0.25); player = Players.LocalPlayer end
    if not alive then return end
    local placeId = game.PlaceId > 0 and tostring(game.PlaceId) or nil
    local gameName
    if placeId then
        local ok, info = pcall(function()
            return MarketplaceService:GetProductInfoAsync(game.PlaceId, Enum.InfoType.Asset)
        end)
        if ok and type(info) == "table" and type(info.Name) == "string" and info.Name:match("%S") then
            local ending = utf8.offset(info.Name, 161)
            gameName = ending and info.Name:sub(1, ending - 1) or info.Name
        end
    end
    if not alive then return end
    table.insert(connections, Players.PlayerRemoving:Connect(function(leaving)
        if leaving == player then controller.Stop() end
    end))
    -- Hiding/minimizing a panel does not end a session; destroying it does.
    local roots = {}
    local function addRoot(root)
        if typeof(root) ~= "Instance" then return end
        for _, current in ipairs(roots) do if current == root then return end end
        table.insert(roots, root)
    end
    addRoot(player:FindFirstChildOfClass("PlayerGui"))
    pcall(function() addRoot(game:GetService("CoreGui")) end)
    pcall(function() if type(gethui) == "function" then addRoot(gethui()) end end)
    local bound = false
    local function candidate(gui)
        if not bound and gui.Name == "mainFrame" and gui:IsA("GuiObject") then
            bound = controller.BindGui(gui)
        end
    end
    for _, root in ipairs(roots) do
        if bound then break end
        table.insert(watchConnections, root.DescendantAdded:Connect(candidate))
        for _, gui in ipairs(root:GetDescendants()) do
            candidate(gui)
            if bound then break end
        end
    end

    local delaySeconds = 0
    local failures = 0
    while alive do
        if delaySeconds > 0 then task.wait(delaySeconds) end
        if not alive then break end
        local result, code
        if not sessionToken then
            result, code = post("/api/presence/session", {
                userId = tostring(player.UserId), username = player.Name, displayName = player.DisplayName,
                placeId = placeId, gameName = gameName,
            })
            if result and type(result.token) == "string" and #result.token == 64 then
                if not alive then
                    task.spawn(function() post("/api/presence/end", {}, result.token) end)
                    break
                end
                sessionToken = result.token
            else
                result = nil
            end
        else
            result, code = post("/api/presence/heartbeat", {}, sessionToken)
            if code == 401 then sessionToken = nil end
        end
        if not alive then break end
        if result then
            failures = 0
            controller.Status = "online"
            delaySeconds = 30
        else
            failures = math.min(failures + 1, 4)
            controller.Status = "offline"
            delaySeconds = math.min(15 * 2 ^ (failures - 1), 120)
        end
    end
end)

return controller
