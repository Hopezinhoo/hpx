-- HPX Sync 2.0: bundle local. O backend transmite somente dados, nunca código.
local factories, cache = {}, {}
local function require(name)
    if cache[name] == nil then
        assert(factories[name], "Módulo HPX ausente: " .. name)
        cache[name] = factories[name](require)
    end
    return cache[name]
end

factories["Transport"] = function(require)
local HttpService = game:GetService("HttpService")
local Transport = {}
Transport.__index = Transport

function Transport.new(config)
    local environment = type(getgenv) == "function" and getgenv() or _G
    local requestApi = config.Request or rawget(environment, "request") or rawget(environment, "http_request")
    local synApi = rawget(environment, "syn")
    if not requestApi and type(synApi) == "table" then requestApi = synApi.request end
    local socketApi = rawget(environment, "WebSocket") or rawget(environment, "websocket")
    local connectApi = not config.DisableWebSocket and (config.ConnectWebSocket or (type(socketApi) == "table" and socketApi.connect)) or nil
    assert(type(requestApi) == "function", "[HPX] Ambiente sem HTTP externo compatível. Forneça Config.Request.")
    local baseUrl = assert(config.BaseUrl, "[HPX] Configure BaseUrl"):gsub("/+$", "")
    local host = baseUrl:match("^http://([^/]+)")
    local localHttp = host == "localhost" or host == "127.0.0.1" or (host and (host:match("^localhost:%d+$") or host:match("^127%.0%.0%.1:%d+$")))
    assert(baseUrl:match("^https://") or localHttp, "[HPX] Use HTTPS; HTTP somente em loopback para desenvolvimento.")
    return setmetatable({ baseUrl = baseUrl, request = requestApi, connect = type(connectApi) == "function" and connectApi or nil }, Transport)
end

function Transport:Http(method, path, body, token)
    local headers = { ["Content-Type"] = "application/json" }
    if token then headers.Authorization = "Bearer " .. token end
    local options = { Url = self.baseUrl .. path, Method = method, Headers = headers }
    if body then options.Body = HttpService:JSONEncode(body) end
    local ok, response = pcall(self.request, options)
    if not ok or type(response) ~= "table" then return nil, { code = "http_transport_failed", status = 0 } end
    local status = tonumber(response.StatusCode or response.Status) or 0
    local decoded, payload = pcall(function() return HttpService:JSONDecode(response.Body or "{}") end)
    if not decoded or type(payload) ~= "table" then return nil, { code = "invalid_response", status = status } end
    if status < 200 or status >= 300 then payload.status = status; return nil, payload end
    return payload
end

function Transport:OpenSocket(onMessage, onClose)
    if not self.connect then return nil, "websocket_unsupported" end
    local ok, raw = pcall(self.connect, self.baseUrl:gsub("^http", "ws") .. "/ws")
    if not ok or not raw then return nil, "websocket_connect_failed" end
    local socket = { raw = raw, closed = false, connections = {} }
    function socket:Send(payload)
        if self.closed then return false end
        return pcall(function() self.raw:Send(HttpService:JSONEncode(payload)) end)
    end
    function socket:Close()
        if self.closed then return end
        self.closed = true
        for _, connection in ipairs(self.connections) do connection:Disconnect() end
        pcall(function() self.raw:Close() end)
    end
    local connected = pcall(function()
        table.insert(socket.connections, raw.OnMessage:Connect(function(message)
            local valid, payload = pcall(function() return HttpService:JSONDecode(message) end)
            if valid and type(payload) == "table" then onMessage(payload) end
        end))
        table.insert(socket.connections, raw.OnClose:Connect(function()
            if socket.closed then return end
            socket.closed = true
            for _, connection in ipairs(socket.connections) do connection:Disconnect() end
            onClose()
        end))
    end)
    if not connected then socket:Close(); return nil, "websocket_adapter_incompatible" end
    return socket
end
return Transport

end

factories["RoomManager"] = function(require)
local Players = game:GetService("Players")
local RoomManager = {}
function RoomManager.Claims()
    assert(Players.LocalPlayer, "[HPX] Execute no cliente Roblox")
    assert(game.JobId ~= "", "[HPX] JobId vazio: conecte-se a uma instância publicada para sincronizar.")
    return { protocol = 2, placeId = tostring(game.PlaceId), jobId = tostring(game.JobId), userId = tostring(Players.LocalPlayer.UserId) }
end
return RoomManager

end

factories["EffectRegistry"] = function(require)
local RunService = game:GetService("RunService")
local Registry = {}
Registry.__index = Registry
local function sameEffect(a, b)
    if not a then return false end
    for _, key in ipairs({ "effectType", "owner", "ownerUserId", "createdAt", "expiresAt" }) do
        if a[key] ~= b[key] then return false end
    end
    for _, key in ipairs({ "position", "rotation", "properties" }) do
        for field, value in pairs(a[key]) do if b[key][field] ~= value then return false end end
        for field, value in pairs(b[key]) do if a[key][field] ~= value then return false end end
    end
    return true
end
function Registry.new(serverClock)
    local self = setmetatable({ types = {}, visuals = {}, clock = serverClock }, Registry)
    self.folder = Instance.new("Folder")
    self.folder.Name = "HPX_Sync_2_Visuals"
    self.folder.Parent = workspace
    self.connection = RunService.RenderStepped:Connect(function(dt)
        local now = self.clock()
        for id, entry in pairs(self.visuals) do
            if entry.active and entry.expiresAt <= now then entry.active = false; entry.handle:Destroy(false) end
            local ok, alive = pcall(function() return entry.handle:Step(dt, now) end)
            if not ok or alive == false then
                pcall(function() entry.handle:Destroy(true) end)
                self.visuals[id] = nil
                if not ok then warn("[HPX] Falha no efeito local; recursos removidos") end
            end
        end
    end)
    return self
end
function Registry:Register(name, effect)
    assert(type(effect) == "table" and type(effect.new) == "function", "[HPX] Efeito precisa de new, Update, Step e Destroy")
    self.types[name] = effect
end
function Registry:Upsert(effect)
    if not self.folder or type(effect) ~= "table" or type(effect.effectId) ~= "string" then return false end
    local implementation = self.types[effect.effectType]
    if not implementation then warn("[HPX] Tipo de efeito não suportado:", effect.effectType); return false end
    local entry = self.visuals[effect.effectId]
    local ok = pcall(function()
        if entry and entry.active then
            if not sameEffect(entry.effect, effect) then entry.handle:Update(effect) end
            entry.expiresAt, entry.effect = effect.expiresAt, effect
        else
            if entry then entry.handle:Destroy(true) end
            self.visuals[effect.effectId] = { handle = implementation.new(effect, self.folder), active = true, expiresAt = effect.expiresAt, effect = effect }
        end
    end)
    if not ok and entry then
        pcall(function() entry.handle:Destroy(true) end)
        self.visuals[effect.effectId] = nil
    end
    return ok
end
function Registry:Remove(id)
    local entry = self.visuals[id]
    if entry and entry.active then entry.active = false; entry.handle:Destroy(false) end
end
function Registry:Snapshot(effects)
    local present, rendered = {}, {}
    for _, effect in ipairs(effects) do
        present[effect.effectId] = true
        if self:Upsert(effect) then table.insert(rendered, effect.effectId) end
    end
    for id in pairs(self.visuals) do if not present[id] then self:Remove(id) end end
    return rendered
end
function Registry:Clear()
    for _, entry in pairs(self.visuals) do pcall(function() entry.handle:Destroy(true) end) end
    table.clear(self.visuals)
end
function Registry:Destroy()
    self:Clear()
    if self.connection then self.connection:Disconnect(); self.connection = nil end
    if self.folder then self.folder:Destroy(); self.folder = nil end
end
return Registry

end

factories["effects/Visual"] = function(require)
local Players = game:GetService("Players")
local Visual = {}
Visual.__index = Visual
local function part(model, name, size, frame, color, transparency)
    local value = Instance.new("Part")
    value.Name, value.Size, value.CFrame = name, size, frame
    value.Anchored, value.CanCollide, value.CanTouch, value.CanQuery = true, false, false, false
    value.Material, value.Color, value.Transparency, value.CastShadow = Enum.Material.Neon, color, transparency, false
    value.Parent = model
    return value
end
function Visual.new(effect, parent, kind)
    local self = setmetatable({ kind = kind, alpha = 0, removing = false, phase = 0 }, Visual)
    self.model = Instance.new("Model")
    self.model.Name = "HPX_" .. kind .. "_" .. effect.effectId
    self.model.Parent = parent
    local ok, err = pcall(function() self:Update(effect) end)
    if not ok then self.model:Destroy(); error(err) end
    return self
end
function Visual:Update(effect)
    self.effect = effect
    self.model:ClearAllChildren()
    self.parts = {}
    local properties = effect.properties
    self.color = Color3.fromHex(properties.color)
    local radius = properties.size * 0.5
    self.origin = part(self.model, "Origin", Vector3.new(0.1, 0.1, 0.1), CFrame.new(), self.color, 1)
    self.model.PrimaryPart = self.origin
    if self.kind ~= "particles" then
        for i = 1, 32 do
            local angle = i / 32 * math.pi * 2
            local frame = CFrame.new(math.cos(angle) * radius, math.sin(angle) * radius, 0) * CFrame.Angles(0, 0, angle + math.pi / 2)
            table.insert(self.parts, part(self.model, "EnergyRing", Vector3.new(radius * 0.22, 0.16, 0.22), frame, self.color, 1))
        end
    end
    if self.kind == "portal" then
        local core = part(self.model, "Vortex", Vector3.new(0.1, radius * 1.85, radius * 1.85), CFrame.Angles(0, math.pi / 2, 0), self.color, 1)
        core.Shape = Enum.PartType.Cylinder
        self.core = core
    else self.core = nil end
    self.light = Instance.new("PointLight")
    self.light.Color, self.light.Range, self.light.Brightness = self.color, math.min(40, properties.size * 2), 0
    self.light.Parent = self.origin
    self.emitter = Instance.new("ParticleEmitter")
    self.emitter.Texture = "rbxasset://textures/particles/sparkles_main.dds"
    self.emitter.Color = ColorSequence.new(self.color)
    self.emitter.LightEmission = 1
    self.emitter.Lifetime = NumberRange.new(0.4, 1)
    self.emitter.Speed = NumberRange.new(1, 3)
    self.emitter.SpreadAngle = Vector2.new(180, 180)
    self.emitter.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.25), NumberSequenceKeypoint.new(1, 0) })
    self.emitter.Rate = 0
    self.emitter.Parent = self.origin
    self:Step(0, 0)
end
function Visual:Step(dt, serverTime)
    if not self.model or not self.model.Parent then return false end
    self.alpha = math.clamp(self.alpha + (self.removing and -1 or 1) * dt / 0.35, 0, 1)
    if self.removing and self.alpha <= 0 then return false end
    local effect, properties = self.effect, self.effect.properties
    local p, r = effect.position, effect.rotation
    local frame = CFrame.new(p.x, p.y, p.z) * CFrame.Angles(math.rad(r.x), math.rad(r.y), math.rad(r.z))
    local visible = true
    if self.kind == "aura" then
        local owner = Players:GetPlayerByUserId(tonumber(effect.ownerUserId) or 0)
        local root = owner and owner.Character and owner.Character:FindFirstChild("HumanoidRootPart")
        if root then frame = CFrame.new(root.Position) * CFrame.new(0, -2.4, 0) * CFrame.Angles(math.pi / 2, 0, 0)
        else visible = false end
    end
    local phase = properties.animation == "none" and 0 or math.max(0, serverTime - effect.createdAt) / 1000
    self.model:PivotTo(frame * CFrame.Angles(0, 0, phase * 0.8))
    local alpha = visible and self.alpha or 0
    for _, value in ipairs(self.parts) do value.Transparency = 1 - alpha * (0.85 + math.sin(phase * 3) * 0.1) end
    if self.core then self.core.Transparency = 1 - alpha * (0.3 + math.sin(phase * 2) * 0.08) end
    self.light.Brightness = alpha * 2
    self.emitter.Rate = self.removing and 0 or alpha * (self.kind == "particles" and 35 or 20)
    return true
end
function Visual:Destroy(immediate)
    if immediate then if self.model then self.model:Destroy(); self.model = nil end
    else self.removing = true; if self.emitter then self.emitter.Enabled = false end end
end
return Visual

end

factories["effects/Portal"] = function(require)
local Visual = require("effects/Visual")
return { new = function(effect, parent) return Visual.new(effect, parent, "portal") end }

end

factories["effects/Aura"] = function(require)
local Visual = require("effects/Visual")
return { new = function(effect, parent) return Visual.new(effect, parent, "aura") end }

end

factories["effects/Particles"] = function(require)
local Visual = require("effects/Visual")
return { new = function(effect, parent) return Visual.new(effect, parent, "particles") end }

end

factories["HPXSync"] = function(require)
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local Transport = require("Transport")
local RoomManager = require("RoomManager")
local EffectRegistry = require("EffectRegistry")
local HPXSync = {}
HPXSync.__index = HPXSync

function HPXSync.new(config)
    local self = setmetatable({ config = config, transport = Transport.new(config), running = false, queue = {}, reported = {}, nextSeq = 1, sequence = 0, offset = 0, participants = 0, connectionStatus = "desconectado", nextSocketAttempt = 0 }, HPXSync)
    self.registry = EffectRegistry.new(function() return os.clock() * 1000 + self.offset end)
    return self
end
function HPXSync:_status(value)
    self.connectionStatus = value
    if type(self.config.OnStatus) == "function" then
        local ok = pcall(self.config.OnStatus, self:GetStatus())
        if not ok then warn("[HPX] Erro no callback OnStatus") end
    end
end
function HPXSync:_cancelTasks()
    local current = coroutine.running()
    for _, key in ipairs({ "workerThread", "networkThread" }) do
        local thread = self[key]
        if thread and thread ~= current then pcall(task.cancel, thread) end
        self[key] = nil
    end
end
function HPXSync:GetStatus()
    return { status = self.connectionStatus, roomId = self.roomId, participants = self.participants, latency = self.latency, transport = self.wsReady and "websocket" or "http-polling", enabled = self.running, expiresAt = self.expiresAt }
end
function HPXSync:_enqueue(payload, waitForResult)
    if not self.running then return false, "not_connected" end
    if #self.queue >= 256 then return false, "client_queue_full" end
    payload.messageId = HttpService:GenerateGUID(false)
    local entry = { payload = payload, done = false }
    local index = #self.queue + 1
    if waitForResult then
        for i, queued in ipairs(self.queue) do
            if queued ~= self.pending and queued.payload.type == "effect:rendered" then index = i; break end
        end
    end
    table.insert(self.queue, index, entry)
    if not waitForResult then return true end
    while self.running and not entry.done do task.wait(0.03) end
    if entry.result and entry.result.type == "ack" then return true, entry.result.effectId end
    return false, entry.error or "disconnected"
end
function HPXSync:_rendered(id)
    if self.reported[id] then return end
    local accepted = self:_enqueue({ type = "effect:rendered", effectId = id }, false)
    if accepted then self.reported[id] = true; print("[HPX] Efeito criado localmente:", id) end
end
function HPXSync:_message(message)
    if not self.running then return end
    if message.serverTime then self.offset = message.serverTime - os.clock() * 1000 end
    self.lastMessage = os.clock()
    if message.type == "ack" then
        if self.pending and self.pending.payload.messageId == message.messageId then self.pending.result = message end
        return
    elseif message.type == "error" then
        if self.pending then self.pending.failure = message end
        if message.code == "session_expired" then self:_expire() end
        return
    elseif message.type == "pong" then
        if self.pingBegan then self.latency = math.floor((os.clock() - self.pingBegan) * 1000) end
        return
    elseif message.type == "snapshot" then
        if message.roomId ~= self.expectedRoom then self:_expire(); warn("[HPX] Sessão pertence a outra instância"); return end
        self.roomId, self.sessionId, self.expiresAt = message.roomId, message.sessionId, message.expiresAt
        self.sequence, self.participants = message.sequence, message.participants
        if not self.pending then self.nextSeq = message.nextClientSeq end
        self.needsSnapshot = false
        local present = {}
        for _, effect in ipairs(message.effects) do present[effect.effectId] = true end
        for id in pairs(self.reported) do if not present[id] then self.reported[id] = nil end end
        for _, id in ipairs(self.registry:Snapshot(message.effects)) do self:_rendered(id) end
        self:_status(self.wsReady and "conectado" or "conectado por HTTP")
        return
    elseif message.type == "delta" then
        for _, event in ipairs(message.events) do self:_message(event) end
        self.participants = message.participants
        if message.sequence ~= self.sequence then self.needsSnapshot = true end
        self:_status(self.wsReady and "conectado" or "conectado por HTTP")
        return
    end
    if type(message.sequence) ~= "number" or message.sequence <= self.sequence then return end
    if message.sequence ~= self.sequence + 1 then self.needsSnapshot = true; return end
    self.sequence = message.sequence
    if message.type == "effect:create" or message.type == "effect:update" then
        if self.registry:Upsert(message.effect) then self:_rendered(message.effect.effectId) end
    elseif message.type == "effect:remove" then
        self.registry:Remove(message.effectId); self.reported[message.effectId] = nil
    elseif message.type == "presence" then self.participants = message.participants; self:_status(self.connectionStatus) end
end
function HPXSync:_expire()
    self.running, self.token, self.wsReady = false, nil, false
    self.generation = (self.generation or 0) + 1
    self:_cancelTasks()
    if self.socket then self.socket:Close(); self.socket = nil end
    for _, entry in ipairs(self.queue) do entry.error = "session_expired"; entry.done = true end
    table.clear(self.queue); table.clear(self.reported)
    self.pending, self.config.SessionToken, self.nextSeq = nil, nil, 1
    self.registry:Clear(); self.participants = 0
    self:_status("sessão encerrada; forneça novo convite")
end
function HPXSync:_worker(generation)
    while self.running and self.generation == generation do
        local entry = self.queue[1]
        if not entry then task.wait(0.05)
        else
            self.pending = entry
            entry.payload.clientSeq = self.nextSeq
            local delay = 0.5
            while self.running and self.generation == generation and not entry.done do
                entry.failure = nil
                if self.wsReady and self.socket and self.socket:Send(entry.payload) then
                    local deadline = os.clock() + 4
                    while self.running and not entry.result and not entry.failure and os.clock() < deadline do task.wait(0.03) end
                end
                local response, failure = entry.result, entry.failure
                if not response and not failure and self.running then response, failure = self.transport:Http("POST", "/api/events", entry.payload, self.token) end
                if not self.running or self.generation ~= generation then break end
                if response and response.type == "ack" then
                    entry.result, entry.done, self.nextSeq = response, true, response.clientSeq + 1
                    if entry.payload.type == "effect:create" then print("[HPX] Efeito confirmado pelo servidor:", response.effectId) end
                elseif failure and (failure.status == 401 or failure.code == "session_expired") then self:_expire()
                elseif failure and (failure.code == "rate_limited" or failure.status == 0 or (failure.status and failure.status >= 500)) then
                    task.wait(delay + math.random() * 0.15); delay = math.min(5, delay * 2)
                else
                    entry.error, entry.done = failure and failure.code or "invalid_ack", true
                    if failure and failure.nextClientSeq then self.nextSeq = failure.nextClientSeq end
                end
            end
            if self.generation ~= generation then return end
            if self.queue[1] == entry then table.remove(self.queue, 1) end
            self.pending = nil
            task.wait(0.12)
        end
    end
end
function HPXSync:_openSocket(generation)
    if not self.transport.connect then return false end
    local current
    local socket, err = self.transport:OpenSocket(function(payload)
        if not self.running or self.generation ~= generation then return end
        if payload.type == "snapshot" then self.wsReady = true end
        self:_message(payload)
    end, function()
        if self.socket == current then self.socket = nil; self.wsReady = false; self:_status("reconectando por HTTP") end
    end)
    if not socket then return false, err end
    if not self.running or self.generation ~= generation then socket:Close(); return false end
    current, self.socket = socket, socket
    self.wsReady = false
    if not socket:Send({ type = "auth", token = self.token }) then socket:Close(); self.socket = nil; return false end
    local deadline = os.clock() + 5
    while self.running and not self.wsReady and self.socket == socket and os.clock() < deadline do task.wait(0.05) end
    if not self.wsReady then socket:Close(); if self.socket == socket then self.socket = nil end; return false end
    return true
end
function HPXSync:_network(generation)
    local failures, socketFailures, nextPoll, nextPing = 0, 0, 0, 0
    local pollSeconds = math.clamp(tonumber(self.config.PollSeconds) or 2.5, 1.5, 15)
    while self.running and self.generation == generation do
        local now = os.clock()
        if not self.socket and self.transport.connect and now >= self.nextSocketAttempt then
            local ok = self:_openSocket(generation)
            socketFailures = ok and 0 or socketFailures + 1
            self.nextSocketAttempt = os.clock() + math.min(30, 2 ^ math.min(socketFailures, 5)) + math.random()
        end
        if not self.running or self.generation ~= generation then break end
        if self.wsReady and self.socket then
            if now >= nextPing then self.pingBegan = os.clock(); self.socket:Send({ type = "ping" }); nextPing = now + 10 end
            if now - (self.lastMessage or now) > 45 then self.socket:Close(); self.socket = nil; self.wsReady = false end
        end
        if (not self.wsReady or self.needsSnapshot) and now >= nextPoll then
            local path = "/api/sync" .. (self.needsSnapshot and "" or "?after=" .. tostring(self.sequence))
            local began = os.clock()
            local snapshot, err = self.transport:Http("GET", path, nil, self.token)
            if not self.running or self.generation ~= generation then break end
            if snapshot then
                self.latency = math.floor((os.clock() - began) * 1000); failures = 0
                self:_message(snapshot)
                nextPoll = os.clock() + pollSeconds
            else
                if err.status == 401 then self:_expire(); break end
                failures = failures + 1; self:_status("reconectando")
                nextPoll = os.clock() + math.min(20, pollSeconds * 2 ^ math.min(failures, 4)) + math.random()
            end
        end
        task.wait(0.15)
    end
end
function HPXSync:Connect(inviteCode)
    if self.destroyed then return false, "client_destroyed" end
    if self.running then return true end
    local claims = RoomManager.Claims()
    self.expectedRoom = "2:" .. claims.placeId .. ":" .. claims.jobId
    self:_status("conectando")
    self.token = self.token or self.config.SessionToken
    local snapshot, err
    if self.token then snapshot, err = self.transport:Http("GET", "/api/sync", nil, self.token)
    else
        claims.inviteCode = inviteCode or self.config.InviteCode
        if not claims.inviteCode then self:_status("convite necessário"); return false, "invite_required" end
        local result
        result, err = self.transport:Http("POST", "/api/session", claims)
        if result then self.token, snapshot = result.token, result.snapshot; self.config.InviteCode = nil end
    end
    if not snapshot then self:_status(err and err.code or "falha na conexão"); if err and err.status == 401 then self.token = nil; self.config.SessionToken = nil end; return false, err and err.code end
    self.running, self.generation = true, (self.generation or 0) + 1
    self:_message(snapshot)
    if not self.running then return false, "room_mismatch" end
    local generation = self.generation
    self.workerThread = task.spawn(function() self:_worker(generation) end)
    self.networkThread = task.spawn(function() self:_network(generation) end)
    print("[HPX] Servidor conectado; sala identificada:", self.roomId)
    if not self.transport.connect then print("[HPX] WebSocket indisponível; usando HTTP polling") end
    return true
end
function HPXSync:CreateEffect(effectType, data)
    data = data or {}
    local position = data.position
    if not position then
        local character = Players.LocalPlayer.Character
        local root = character and character:FindFirstChild("HumanoidRootPart")
        if not root then return false, "character_unavailable" end
        local p = root.Position + root.CFrame.LookVector * (effectType == "aura" and 0 or 8)
        position = { x = p.X, y = p.Y, z = p.Z }
    end
    local properties = { color = "#00FF66", size = 8, duration = 120, animation = "energy-vortex" }
    for key, value in pairs(data.properties or {}) do properties[key] = value end
    return self:_enqueue({ type = "effect:create", effectType = effectType, position = position, rotation = data.rotation or { x = 0, y = 0, z = 0 }, properties = properties }, true)
end
function HPXSync:UpdateEffect(id, changes)
    changes = changes or {}
    return self:_enqueue({ type = "effect:update", effectId = id, position = changes.position, rotation = changes.rotation, properties = changes.properties }, true)
end
function HPXSync:RemoveEffect(id) return self:_enqueue({ type = "effect:remove", effectId = id }, true) end
function HPXSync:CreatePortal(properties) return self:CreateEffect("portal", { properties = properties }) end
function HPXSync:RemovePortal(id) return self:RemoveEffect(id) end
function HPXSync:Reconnect(inviteCode)
    if not self.running then return self:Connect(inviteCode) end
    if self.socket then self.socket:Close(); self.socket = nil end
    self.wsReady, self.needsSnapshot, self.nextSocketAttempt = false, true, 0
    self:_status("reconectando"); return true
end
function HPXSync:Disconnect()
    local token = self.token
    self.running, self.wsReady = false, false
    self.generation = (self.generation or 0) + 1
    self:_cancelTasks()
    if self.socket then self.socket:Close(); self.socket = nil end
    for _, entry in ipairs(self.queue) do entry.error = "disconnected"; entry.done = true end
    table.clear(self.queue); table.clear(self.reported)
    self.pending, self.token, self.config.SessionToken = nil, nil, nil
    self.sequence, self.participants, self.nextSeq = 0, 0, 1
    self.registry:Clear(); self:_status("desconectado")
    if token then self.transport:Http("DELETE", "/api/session", nil, token) end
end
function HPXSync:SetEnabled(enabled, inviteCode)
    if enabled then return self:Connect(inviteCode) end
    self:Disconnect(); return true
end
function HPXSync:Stop() self:Disconnect(); self.registry:Destroy(); self.destroyed = true end
return HPXSync

end

factories["Integration"] = function(require)
-- Callbacks prontos para ligar à API REAL do painel HPX. Não presumem uma biblioteca de UI.
local Integration = {}
function Integration.Bind(sync)
    local portals = {}
    local properties = { color = "#00FF66", size = 8, duration = 120, animation = "energy-vortex" }
    return {
        GetStatus = function() return sync:GetStatus() end,
        Reconnect = function(code) return sync:Reconnect(code) end,
        Disconnect = function() sync:Disconnect() end,
        SetSyncEnabled = function(enabled, code) return sync:SetEnabled(enabled, code) end,
        SetColor = function(color) properties.color = color end,
        SetSize = function(size) properties.size = size end,
        SetDuration = function(seconds) properties.duration = seconds end,
        CreatePortal = function()
            local ok, id = sync:CreatePortal(table.clone(properties))
            if ok then table.insert(portals, id) end
            return ok, id
        end,
        RemovePortals = function()
            for i = #portals, 1, -1 do
                local ok, err = sync:RemovePortal(portals[i])
                if ok or err == "effect_not_found" then table.remove(portals, i) end
            end
        end,
        UpdatePortal = function(id) return sync:UpdateEffect(id, { properties = table.clone(properties) }) end,
    }
end
return Integration

end

factories["main"] = function(require)
local HPXSync = require("HPXSync")
local Portal = require("effects/Portal")
local Aura = require("effects/Aura")
local Particles = require("effects/Particles")
return function(config)
    local sync = HPXSync.new(config)
    sync.registry:Register("portal", Portal)
    sync.registry:Register("aura", Aura)
    sync.registry:Register("particles", Particles)
    return sync
end

end

local CreateClient = require("main")
return { new = CreateClient, Integration = require("Integration") }
