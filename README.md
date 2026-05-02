-- Generated using RoadToGlory's Converter v1.1 (RoadToGlory#9879)

-- Instances:

local Converted = {
	["_ScreenGui"] = Instance.new("ScreenGui");
	["_mainFrame"] = Instance.new("Frame");
	["_LocalScript"] = Instance.new("LocalScript");
	["_configUS"] = Instance.new("Frame");
	["_ImageLabel"] = Instance.new("ImageLabel");
	["_titulo"] = Instance.new("TextLabel");
	["_movi"] = Instance.new("Frame");
	["_EspButton"] = Instance.new("TextButton");
	["_TextButton"] = Instance.new("TextButton");
	["_BindButton"] = Instance.new("TextButton");
	["_LocalScript1"] = Instance.new("LocalScript");
	["_menu"] = Instance.new("Frame");
	["_MoviButton"] = Instance.new("TextButton");
	["_ConfigButton"] = Instance.new("TextButton");
	["_UIListLayout"] = Instance.new("UIListLayout");
	["_LocalScript2"] = Instance.new("LocalScript");
	["_divisor"] = Instance.new("Frame");
	["_LocalScript3"] = Instance.new("LocalScript");
	["_LocalScript4"] = Instance.new("LocalScript");
	["_LocalScript5"] = Instance.new("LocalScript");
}

-- Properties:

Converted["_ScreenGui"].ZIndexBehavior = Enum.ZIndexBehavior.Sibling
Converted["_ScreenGui"].Parent = game:GetService("CoreGui")

Converted["_mainFrame"].BackgroundColor3 = Color3.fromRGB(1.0000000591389835, 5.000000176951289, 29.000002071261406)
Converted["_mainFrame"].BorderColor3 = Color3.fromRGB(0, 255, 0)
Converted["_mainFrame"].BorderSizePixel = 0
Converted["_mainFrame"].Position = UDim2.new(0.167694062, 0, 0.207079858, 0)
Converted["_mainFrame"].Size = UDim2.new(0, 698, 0, 515)
Converted["_mainFrame"].Name = "mainFrame"
Converted["_mainFrame"].Parent = Converted["_ScreenGui"]

Converted["_configUS"].BackgroundColor3 = Color3.fromRGB(255, 255, 255)
Converted["_configUS"].BackgroundTransparency = 1
Converted["_configUS"].BorderColor3 = Color3.fromRGB(0, 0, 0)
Converted["_configUS"].BorderSizePixel = 0
Converted["_configUS"].Position = UDim2.new(0, 0, 0.00194174761, 0)
Converted["_configUS"].Size = UDim2.new(0, 170, 0, 50)
Converted["_configUS"].Visible = false
Converted["_configUS"].ZIndex = 10
Converted["_configUS"].Name = "configUS"
Converted["_configUS"].Parent = Converted["_mainFrame"]

Converted["_ImageLabel"].Image = "rbxasset://textures/ui/GuiImagePlaceholder.png"
Converted["_ImageLabel"].ImageContent = Content{SourceType=Uri, Uri=rbxasset://textures/ui/GuiImagePlaceholder.png}
Converted["_ImageLabel"].BackgroundColor3 = Color3.fromRGB(255, 255, 255)
Converted["_ImageLabel"].BorderColor3 = Color3.fromRGB(245.00001579523087, 197.00001865625381, 255)
Converted["_ImageLabel"].BorderSizePixel = 4
Converted["_ImageLabel"].Position = UDim2.new(1.29097652, 0, 0.585964978, 0)
Converted["_ImageLabel"].Size = UDim2.new(0, 138, 0, 132)
Converted["_ImageLabel"].Parent = Converted["_configUS"]

Converted["_titulo"].Font = Enum.Font.LuckiestGuy
Converted["_titulo"].Text = "HPX"
Converted["_titulo"].TextColor3 = Color3.fromRGB(255, 255, 255)
Converted["_titulo"].TextScaled = true
Converted["_titulo"].TextSize = 60
Converted["_titulo"].TextStrokeTransparency = 0
Converted["_titulo"].TextWrapped = true
Converted["_titulo"].BackgroundColor3 = Color3.fromRGB(255, 255, 255)
Converted["_titulo"].BackgroundTransparency = 1
Converted["_titulo"].BorderColor3 = Color3.fromRGB(245.00001579523087, 197.00001865625381, 255)
Converted["_titulo"].BorderSizePixel = 0
Converted["_titulo"].Position = UDim2.new(3.40588307, 0, 0.239999995, 0)
Converted["_titulo"].Size = UDim2.new(0, 118, 0, 52)
Converted["_titulo"].Name = "titulo"
Converted["_titulo"].Parent = Converted["_configUS"]

Converted["_movi"].BackgroundColor3 = Color3.fromRGB(255, 255, 255)
Converted["_movi"].BackgroundTransparency = 1
Converted["_movi"].BorderColor3 = Color3.fromRGB(0, 0, 0)
Converted["_movi"].BorderSizePixel = 0
Converted["_movi"].Position = UDim2.new(0, 0, 0.128155336, 0)
Converted["_movi"].Size = UDim2.new(0, 170, 0, 50)
Converted["_movi"].ZIndex = 10
Converted["_movi"].Name = "movi"
Converted["_movi"].Parent = Converted["_mainFrame"]

Converted["_EspButton"].Font = Enum.Font.LuckiestGuy
Converted["_EspButton"].Text = "ESP"
Converted["_EspButton"].TextColor3 = Color3.fromRGB(255, 170.0000050663948, 255)
Converted["_EspButton"].TextSize = 20
Converted["_EspButton"].TextStrokeTransparency = 0
Converted["_EspButton"].BackgroundColor3 = Color3.fromRGB(255, 219.00001734495163, 241.00001603364944)
Converted["_EspButton"].BorderColor3 = Color3.fromRGB(255, 170.0000050663948, 255)
Converted["_EspButton"].BorderSizePixel = 0
Converted["_EspButton"].Position = UDim2.new(1.12941146, 0, -1.10000062, 0)
Converted["_EspButton"].Size = UDim2.new(0, 182, 0, 26)
Converted["_EspButton"].Name = "EspButton"
Converted["_EspButton"].Parent = Converted["_movi"]

Converted["_TextButton"].Font = Enum.Font.SourceSans
Converted["_TextButton"].TextColor3 = Color3.fromRGB(0, 0, 0)
Converted["_TextButton"].TextSize = 14
Converted["_TextButton"].BackgroundColor3 = Color3.fromRGB(255, 255, 255)
Converted["_TextButton"].BorderColor3 = Color3.fromRGB(0, 0, 0)
Converted["_TextButton"].BorderSizePixel = 0
Converted["_TextButton"].Position = UDim2.new(2.62941146, 0, -1.08000004, 0)
Converted["_TextButton"].Size = UDim2.new(0, 232, 0, 26)
Converted["_TextButton"].Parent = Converted["_movi"]

Converted["_BindButton"].Font = Enum.Font.Unknown
Converted["_BindButton"].Text = ""
Converted["_BindButton"].TextColor3 = Color3.fromRGB(245.00001579523087, 197.00001865625381, 255)
Converted["_BindButton"].TextSize = 14
Converted["_BindButton"].TextStrokeTransparency = 0
Converted["_BindButton"].BackgroundColor3 = Color3.fromRGB(255, 219.00001734495163, 241.00001603364944)
Converted["_BindButton"].BorderColor3 = Color3.fromRGB(0, 0, 0)
Converted["_BindButton"].BorderSizePixel = 0
Converted["_BindButton"].Position = UDim2.new(2.29999971, 0, -1.10000002, 0)
Converted["_BindButton"].Size = UDim2.new(0, 32, 0, 27)
Converted["_BindButton"].Name = "BindButton"
Converted["_BindButton"].Parent = Converted["_movi"]

Converted["_menu"].BackgroundColor3 = Color3.fromRGB(22.000000588595867, 1.0000000591389835, 18.000000827014446)
Converted["_menu"].BorderColor3 = Color3.fromRGB(252.00001537799835, 216.00001752376556, 255)
Converted["_menu"].BorderMode = Enum.BorderMode.Middle
Converted["_menu"].BorderSizePixel = 5
Converted["_menu"].Position = UDim2.new(0.00143257726, 0, -0.00720025226, 0)
Converted["_menu"].Size = UDim2.new(0, 697, 0, 515)
Converted["_menu"].Name = "menu"
Converted["_menu"].Parent = Converted["_mainFrame"]

Converted["_MoviButton"].Font = Enum.Font.Unknown
Converted["_MoviButton"].Text = "movimento"
Converted["_MoviButton"].TextColor3 = Color3.fromRGB(255, 170.0000050663948, 255)
Converted["_MoviButton"].TextSize = 20
Converted["_MoviButton"].TextStrokeTransparency = 0
Converted["_MoviButton"].BackgroundColor3 = Color3.fromRGB(255, 219.00001734495163, 241.00001603364944)
Converted["_MoviButton"].BorderColor3 = Color3.fromRGB(245.00000059604645, 197.0000034570694, 255)
Converted["_MoviButton"].BorderMode = Enum.BorderMode.Inset
Converted["_MoviButton"].BorderSizePixel = 0
Converted["_MoviButton"].LayoutOrder = 2
Converted["_MoviButton"].Position = UDim2.new(0.00358680054, 0, 0.101941749, 0)
Converted["_MoviButton"].Size = UDim2.new(0, 170, 0, 50)
Converted["_MoviButton"].Name = "MoviButton"
Converted["_MoviButton"].Parent = Converted["_menu"]

Converted["_ConfigButton"].Font = Enum.Font.Unknown
Converted["_ConfigButton"].Text = "CONFIG"
Converted["_ConfigButton"].TextColor3 = Color3.fromRGB(255, 170.0000050663948, 255)
Converted["_ConfigButton"].TextSize = 20
Converted["_ConfigButton"].TextStrokeTransparency = 0
Converted["_ConfigButton"].BackgroundColor3 = Color3.fromRGB(255, 219.00001734495163, 241.00001603364944)
Converted["_ConfigButton"].BorderColor3 = Color3.fromRGB(245.00001579523087, 197.00001865625381, 255)
Converted["_ConfigButton"].BorderMode = Enum.BorderMode.Inset
Converted["_ConfigButton"].BorderSizePixel = 0
Converted["_ConfigButton"].LayoutOrder = 1
Converted["_ConfigButton"].Position = UDim2.new(0.000717360119, 0, 0.115533978, 0)
Converted["_ConfigButton"].Size = UDim2.new(0, 170, 0, 50)
Converted["_ConfigButton"].Name = "ConfigButton"
Converted["_ConfigButton"].Parent = Converted["_menu"]

Converted["_UIListLayout"].SortOrder = Enum.SortOrder.LayoutOrder
Converted["_UIListLayout"].Parent = Converted["_menu"]

Converted["_divisor"].BackgroundColor3 = Color3.fromRGB(247.00001567602158, 217.00001746416092, 255)
Converted["_divisor"].BorderColor3 = Color3.fromRGB(245.00001579523087, 225.00001698732376, 255)
Converted["_divisor"].BorderSizePixel = 0
Converted["_divisor"].Position = UDim2.new(0.256446987, 0, -0.0058253021, 0)
Converted["_divisor"].Size = UDim2.new(0, -7, 0, 517)
Converted["_divisor"].Name = "divisor"
Converted["_divisor"].Parent = Converted["_mainFrame"]

-- Fake Module Scripts:

local fake_module_scripts = {}


-- Fake Local Scripts:

local function NSPLAKN_fake_script() -- Fake Script: StarterGui.ScreenGui.mainFrame.LocalScript
    local script = Instance.new("LocalScript")
    script.Name = "LocalScript"
    script.Parent = Converted["_mainFrame"]
    local req = require
    local require = function(obj)
        local fake = fake_module_scripts[obj]
        if fake then
            return fake()
        end
        return req(obj)
    end

	local mainFrame = script.Parent
	
	local menu = mainFrame:WaitForChild("menu")
	
	local configButton = menu:WaitForChild("ConfigButton")
	local moviButton = menu:WaitForChild("MoviButton")
	
	local configUS = mainFrame:WaitForChild("configUS")
	local movi = mainFrame:WaitForChild("movi")
	
	local function esconderTudo()
		configUS.Visible = false
		movi.Visible = false
	end
	
	local function abrirConfig()
		esconderTudo()
		configUS.Visible = true
	end
	
	local function abrirMovi()
		esconderTudo()
		movi.Visible = true
	end
	
	configButton.MouseButton1Click:Connect(abrirConfig)
	moviButton.MouseButton1Click:Connect(abrirMovi)
	
	abrirConfig()
end
local function CYRLM_fake_script() -- Fake Script: StarterGui.ScreenGui.mainFrame.LocalScript
    local script = Instance.new("LocalScript")
    script.Name = "LocalScript"
    script.Parent = Converted["_mainFrame"]
    local req = require
    local require = function(obj)
        local fake = fake_module_scripts[obj]
        if fake then
            return fake()
        end
        return req(obj)
    end

	local Players = game:GetService("Players")
	
	local player = Players.LocalPlayer
	
	local mainFrame = script.Parent
	local configUS = mainFrame:WaitForChild("configUS")
	local imageLabel = configUS:WaitForChild("ImageLabel")
	
	-- espera player carregar
	repeat task.wait() until player.UserId ~= 0
	
	local userId = player.UserId
	
	local thumbnailType = Enum.ThumbnailType.HeadShot
	local thumbnailSize = Enum.ThumbnailSize.Size420x420
	
	local content, isReady = Players:GetUserThumbnailAsync(userId, thumbnailType, thumbnailSize)
	
	while not isReady do
		task.wait(0.5)
		content, isReady = Players:GetUserThumbnailAsync(userId, thumbnailType, thumbnailSize)
	end
	
	imageLabel.Image = content
	
end
local function OQNBRKG_fake_script() -- Fake Script: StarterGui.ScreenGui.mainFrame.LocalScript
    local script = Instance.new("LocalScript")
    script.Name = "LocalScript"
    script.Parent = Converted["_mainFrame"]
    local req = require
    local require = function(obj)
        local fake = fake_module_scripts[obj]
        if fake then
            return fake()
        end
        return req(obj)
    end

	print("Hello world!")
	local titulo = script.Parent:WaitForChild("configUS"):WaitForChild("titulo")
	
	local hue = 0
	
	while true do
		hue += 0.003
	
		if hue > 1 then
			hue = 0
		end
	
		local color = Color3.fromHSV(hue, 1, 1)
	
		titulo.TextColor3 = color
	
		task.wait(0.01)
	end
end
local function LBWIR_fake_script() -- Fake Script: StarterGui.ScreenGui.mainFrame.LocalScript
    local script = Instance.new("LocalScript")
    script.Name = "LocalScript"
    script.Parent = Converted["_mainFrame"]
    local req = require
    local require = function(obj)
        local fake = fake_module_scripts[obj]
        if fake then
            return fake()
        end
        return req(obj)
    end

	-- SCRIPT ESP (ESP)
	
	
	local button = script.Parent:WaitForChild("EspButton")
	
	local UserInputService = game:GetService("UserInputService")
	
	local espAtivo = false
	
	-- função que liga/desliga
	local function toggleESP()
		espAtivo = not espAtivo
	
		if espAtivo then
			button.Text = "ESP: ON"
			button.BackgroundColor3 = Color3.fromRGB(0, 255, 100)
		else
			button.Text = "ESP: OFF"
			button.BackgroundColor3 = Color3.fromRGB(255, 80, 80)
		end
	
		print("ESP:", espAtivo)
	end
	
	-- clique do botão
	button.MouseButton1Click:Connect(toggleESP)
	
	-- tecla de atalho (EXEMPLO: tecla E)
	UserInputService.InputBegan:Connect(function(input, gameProcessed)
		if gameProcessed then return end
	
		if input.KeyCode == Enum.KeyCode.E then
			toggleESP()
		end
	end)
end
local function TALDJ_fake_script() -- Fake Script: StarterGui.ScreenGui.mainFrame.LocalScript
    local script = Instance.new("LocalScript")
    script.Name = "LocalScript"
    script.Parent = Converted["_mainFrame"]
    local req = require
    local require = function(obj)
        local fake = fake_module_scripts[obj]
        if fake then
            return fake()
        end
        return req(obj)
    end

	-- atalho da telca
	
	
	local Players = game:GetService("Players")
	local RunService = game:GetService("RunService")
	local UserInputService = game:GetService("UserInputService")
	
	local player = Players.LocalPlayer
	local camera = workspace.CurrentCamera
	
	local main = script.Parent
	local movi = main:WaitForChild("movi")
	
	local espButton = movi:WaitForChild("EspButton")
	local bindButton = movi:WaitForChild("BindButton")
	
	local espAtivo = false
	local teclaAtual = nil
	local escolhendoTecla = false
	
	local gui
	local markers = {}
	local renderConnection
	
	local function atualizarBotoes()
		espButton.Text = espAtivo and "ESP: ON" or "ESP: OFF"
	
		if teclaAtual then
			bindButton.Text = "" .. teclaAtual.Name
		else
			bindButton.Text = "_"
		end
	end
	
	local function criarMarker(p)
		if p == player then return end
		if markers[p] then return end
		if not gui then return end
	
		local btn = Instance.new("ImageButton")
		btn.Size = UDim2.new(0, 50, 0, 50)
		btn.BackgroundColor3 = Color3.fromRGB(120, 120, 120)
		btn.BorderSizePixel = 0
		btn.Visible = false
		btn.Parent = gui
	
		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(1, 0)
		corner.Parent = btn
	
		local stroke = Instance.new("UIStroke")
		stroke.Thickness = 3
		stroke.Color = Color3.fromRGB(170, 0, 255)
		stroke.Parent = btn
	
		btn.Image = "https://www.roblox.com/headshot-thumbnail/image?userId="
			.. p.UserId .. "&width=420&height=420&format=png"
	
		markers[p] = btn
	
		btn.MouseButton1Click:Connect(function()
			local myChar = player.Character
			local target = p.Character
	
			if myChar and target and target:FindFirstChild("HumanoidRootPart") then
				myChar:PivotTo(target.HumanoidRootPart.CFrame + Vector3.new(2, 0, 0))
			end
		end)
	end
	
	local function ligarESP()
		gui = Instance.new("ScreenGui")
		gui.Name = "ESP_Gui"
		gui.ResetOnSpawn = false
		gui.Parent = player:WaitForChild("PlayerGui")
	
		for _, p in pairs(Players:GetPlayers()) do
			criarMarker(p)
		end
	
		renderConnection = RunService.RenderStepped:Connect(function()
			local myChar = player.Character
			local myRoot = myChar and myChar:FindFirstChild("HumanoidRootPart")
	
			for p, btn in pairs(markers) do
				local char = p.Character
	
				if char and char:FindFirstChild("Head") and myRoot then
					local headPos = char.Head.Position + Vector3.new(0, 1.5, 0)
					local pos, onScreen = camera:WorldToViewportPoint(headPos)
	
					if onScreen then
						btn.Visible = true
						btn.Position = UDim2.new(0, pos.X - 25, 0, pos.Y - 25)
	
						local dist = (myRoot.Position - char.Head.Position).Magnitude
						local maxDist = 100
						local alpha = math.clamp(dist / maxDist, 0.2, 1)
	
						btn.ImageTransparency = 1 - alpha
						btn.BackgroundTransparency = 1 - alpha
					else
						btn.Visible = false
					end
				else
					btn.Visible = false
				end
			end
		end)
	end
	
	local function desligarESP()
		if renderConnection then
			renderConnection:Disconnect()
			renderConnection = nil
		end
	
		for _, btn in pairs(markers) do
			btn:Destroy()
		end
	
		markers = {}
	
		if gui then
			gui:Destroy()
			gui = nil
		end
	end
	
	local function toggleESP()
		espAtivo = not espAtivo
	
		if espAtivo then
			ligarESP()
		else
			desligarESP()
		end
	
		atualizarBotoes()
	end
	
	espButton.MouseButton1Click:Connect(toggleESP)
	
	bindButton.MouseButton1Click:Connect(function()
		escolhendoTecla = true
		bindButton.Text = ""
	end)
	
	UserInputService.InputBegan:Connect(function(input, gameProcessed)
		if gameProcessed then return end
	
		if escolhendoTecla then
			if input.KeyCode ~= Enum.KeyCode.Unknown then
				teclaAtual = input.KeyCode
				escolhendoTecla = false
				atualizarBotoes()
			end
			return
		end
	
		if teclaAtual and input.KeyCode == teclaAtual then
			toggleESP()
		end
	end)
	
	Players.PlayerAdded:Connect(function(p)
		if espAtivo then
			criarMarker(p)
		end
	end)
	
	Players.PlayerRemoving:Connect(function(p)
		if markers[p] then
			markers[p]:Destroy()
			markers[p] = nil
		end
	end)
	
	atualizarBotoes()
end
local function SZXWLJQ_fake_script() -- Fake Script: StarterGui.ScreenGui.mainFrame.LocalScript
    local script = Instance.new("LocalScript")
    script.Name = "LocalScript"
    script.Parent = Converted["_mainFrame"]
    local req = require
    local require = function(obj)
        local fake = fake_module_scripts[obj]
        if fake then
            return fake()
        end
        return req(obj)
    end

	local UserInputService = game:GetService("UserInputService")
	
	local mainFrame = script.Parent
	local screenGui = mainFrame.Parent
	
	-- 🎨 cor #f5e1ff
	mainFrame.BackgroundColor3 = Color3.fromRGB(245, 225, 255)
	
	-- =========================
	-- 🔻 BOTÃO MINIMIZAR
	-- =========================
	
	local minimizarBtn = Instance.new("TextButton")
	minimizarBtn.Name = "MinimizarButton"
	minimizarBtn.Size = UDim2.new(0, 25, 0, 25) -- menor
	minimizarBtn.Position = UDim2.new(1, -27, 1, -30) -- canto inferior direito
	minimizarBtn.Text = "-"
	minimizarBtn.TextScaled = true
	minimizarBtn.BackgroundColor3 = Color3.fromRGB(245, 225, 255)
	minimizarBtn.TextColor3 = Color3.fromRGB(0, 0, 0)
	minimizarBtn.BorderSizePixel = 0
	minimizarBtn.ZIndex = 100
	minimizarBtn.Parent = mainFrame
	
	-- 🔲 quadrado
	local minCorner = Instance.new("UICorner")
	minCorner.CornerRadius = UDim.new(0, 0)
	minCorner.Parent = minimizarBtn
	
	-- =========================
	-- 🔵 BOLINHA HPX
	-- =========================
	
	local bolinha = Instance.new("TextButton")
	bolinha.Name = "HPX_Bolinha"
	bolinha.Size = UDim2.new(0, 50, 0, 50)
	bolinha.Position = UDim2.new(0, 20, 0, 20)
	bolinha.Text = "HPX"
	bolinha.TextScaled = true
	bolinha.Visible = false
	bolinha.BackgroundColor3 = Color3.fromRGB(245, 225, 255)
	bolinha.TextColor3 = Color3.fromRGB(0, 0, 0)
	bolinha.BorderSizePixel = 0
	bolinha.ZIndex = 200
	bolinha.Parent = screenGui
	
	local ballCorner = Instance.new("UICorner")
	ballCorner.CornerRadius = UDim.new(1, 0)
	ballCorner.Parent = bolinha
	
	-- =========================
	-- 🔻 MINIMIZAR
	-- =========================
	
	minimizarBtn.MouseButton1Click:Connect(function()
		mainFrame.Visible = false
		bolinha.Visible = true
	end)
	
	-- =========================
	-- 🖱️ MOVER PAINEL
	-- =========================
	
	local movendoPainel = false
	local inicioMouse
	local inicioPainel
	
	mainFrame.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			movendoPainel = true
			inicioMouse = input.Position
			inicioPainel = mainFrame.Position
		end
	end)
	
	mainFrame.InputEnded:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			movendoPainel = false
		end
	end)
	
	-- =========================
	-- 🔵 MOVER BOLINHA / CLICK
	-- =========================
	
	local movendoBolinha = false
	local clicouArrastando = false
	local inicioMouseBolinha
	local inicioBolinha
	
	bolinha.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			movendoBolinha = true
			clicouArrastando = false
			inicioMouseBolinha = input.Position
			inicioBolinha = bolinha.Position
		end
	end)
	
	bolinha.InputEnded:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			movendoBolinha = false
	
			-- 🔥 se NÃO arrastou → abre painel
			if not clicouArrastando then
				mainFrame.Visible = true
				bolinha.Visible = false
			end
		end
	end)
	
	-- =========================
	-- 🔄 MOVIMENTO GLOBAL
	-- =========================
	
	UserInputService.InputChanged:Connect(function(input)
		if input.UserInputType ~= Enum.UserInputType.MouseMovement then
			return
		end
	
		-- mover painel
		if movendoPainel then
			local delta = input.Position - inicioMouse
	
			mainFrame.Position = UDim2.new(
				inicioPainel.X.Scale,
				inicioPainel.X.Offset + delta.X,
				inicioPainel.Y.Scale,
				inicioPainel.Y.Offset + delta.Y
			)
		end
	
		-- mover bolinha
		if movendoBolinha then
			local delta = input.Position - inicioMouseBolinha
	
			if math.abs(delta.X) > 5 or math.abs(delta.Y) > 5 then
				clicouArrastando = true
			end
	
			bolinha.Position = UDim2.new(
				inicioBolinha.X.Scale,
				inicioBolinha.X.Offset + delta.X,
				inicioBolinha.Y.Scale,
				inicioBolinha.Y.Offset + delta.Y
			)
		end
	end)
end

coroutine.wrap(NSPLAKN_fake_script)()
coroutine.wrap(CYRLM_fake_script)()
coroutine.wrap(OQNBRKG_fake_script)()
coroutine.wrap(LBWIR_fake_script)()
coroutine.wrap(TALDJ_fake_script)()
coroutine.wrap(SZXWLJQ_fake_script)()
