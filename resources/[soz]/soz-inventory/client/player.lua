RegisterKeyMapping("inventory", "Ouvrir l'inventaire", "keyboard", "F2")
RegisterCommand("inventory", function()
    if PlayerData.metadata["isdead"] or PlayerData.metadata["inlaststand"] or PlayerData.metadata["ishandcuffed"] or IsPauseMenuActive() or IsNuiFocused() then
        return
    end

    exports["menuv"]:SendNUIMessage({action = "KEY_CLOSE_ALL"})
    TriggerEvent("soz-core:client:menu:close", false)

    QBCore.Functions.TriggerCallback("inventory:server:openPlayerInventory", function(inventory)
        if inventory ~= nil then
            local playerState = exports["soz-core"]:GetPlayerState()

            if playerState.isInventoryBusy then
                exports["soz-core"]:DrawNotification("Inventaire en cours d'utilisation", "warning")
                return
            end

            inventory = HydrateInventory(inventory)

            SendNUIMessage({
                action = "openPlayerInventory",
                playerInventory = inventory,
                playerMoney = PlayerData.money["money"] + PlayerData.money["marked_money"],
                playerShortcuts = PlayerData.metadata["shortcuts"] or {},
            })
            SetNuiFocus(true, true)
            InventoryOpen = true

            --- Force player to stop using weapon if input is pressed while inventory is open
            SetNuiFocusKeepInput(true)
            inventoryDisableControlsActions(true)
            Wait(50)
            SetNuiFocusKeepInput(false)
        end
    end, "player")
end, false)

RegisterNUICallback("player/useItem", function(data, cb)
    SetNuiFocus(false, false)
    TriggerServerEvent("inventory:server:UseItemSlot", data.slot)
    cb(true)
end)

RegisterNUICallback("player/setItemUsage", function(data, cb)
    SetNuiFocus(false, false)
    TriggerServerEvent("soz-core:server:inventory:set-item-usage", data.shortcut, data.slot)
    cb(true)
end)

RegisterNUICallback("player/renameItem", function(data, cb)
    SetNuiFocus(false, false)
    local label = exports["soz-core"]:Input("Étiquette", 40, "")
    TriggerServerEvent("inventory:server:renameItem", label, data)
    cb(true)
end)

RegisterNUICallback("player/giveItem", function(data, cb)
    SetNuiFocus(false, false)

    local playerState = exports["soz-core"]:GetPlayerState()

    if playerState.isInHub then
        exports["soz-core"]:DrawNotification("Pas d'échange dans le Hub", "error")
    else
        local player, distance = QBCore.Functions.GetClosestPlayer()
        if player ~= -1 and distance < 2.0 then
            local amount = data.amount

            if tonumber(amount) > 1 then
                amount = tostring(exports["soz-core"]:Input("Quantité", 5, data.amount))
                if tonumber(amount, 10) == nil then
                    exports["soz-core"]:DrawNotification("Vous devez entrer un nombre entier", "error")
                    cb(true)
                    return
                end
            end

            if tonumber(amount, 10) == nil then
                exports["soz-core"]:DrawNotification("Vous devez entrer un nombre entier", "error")
                cb(true)
                return
            end

            if amount and tonumber(amount) > 0 then
                TriggerServerEvent("inventory:server:GiveItem", GetPlayerServerId(player), data, tonumber(amount))
            end
        else
            exports["soz-core"]:DrawNotification("Personne n'est à portée de vous", "error")
        end
    end

    cb(true)
end)

RegisterNUICallback("player/throwItem", function(data, cb)
    local playerState = exports["soz-core"]:GetPlayerState()

    if playerState.isInHub then
        exports["soz-core"]:DrawNotification("Pas d'échange dans le Hub", "error")
    else
        TriggerServerEvent("inventory:server:ThrowItem", data)
    end

    cb(true)
end)

RegisterNUICallback("player/giveMoney", function(data, cb)
    SetNuiFocus(false, false)

    local playerState = exports["soz-core"]:GetPlayerState()

    if playerState.isInHub then
        exports["soz-core"]:DrawNotification("Pas d'échange dans le Hub", "error")
    else
        local player, distance = QBCore.Functions.GetClosestPlayer()
        if player ~= -1 and distance < 2.0 then
            local amount = exports["soz-core"]:Input("Quantité", 12)

            if amount and tonumber(amount) > 0 then
                TriggerServerEvent("inventory:server:GiveMoney", GetPlayerServerId(player), "money", math.ceil(tonumber(amount)))
            end
        else
            exports["soz-core"]:DrawNotification("Personne n'est à portée de vous", "error")
        end
    end

    cb(true)
end)

RegisterNUICallback("player/giveMarkedMoney", function(data, cb)
    SetNuiFocus(false, false)

    local playerState = exports["soz-core"]:GetPlayerState()

    if playerState.isInHub then
        exports["soz-core"]:DrawNotification("Pas d'échange dans le Hub", "error")
    else
        local player, distance = QBCore.Functions.GetClosestPlayer()
        if player ~= -1 and distance < 2.0 then
            local amount = exports["soz-core"]:Input("Quantité", 12)

            if amount and tonumber(amount) > 0 then
                TriggerServerEvent("inventory:server:GiveMoney", GetPlayerServerId(player), "marked_money", math.ceil(tonumber(amount)))
            end
        else
            exports["soz-core"]:DrawNotification("Personne n'est à portée de vous", "error")
        end
    end

    cb(true)
end)

local currentResellZone = nil
AddEventHandler("player/setCurrentResellZone", function(newValue)
    currentResellZone = newValue
end)

RegisterNUICallback("player/giveItemToTarget", function(data, cb)
    local hit, endCoords, _, entityHit, entityType, _ = ScreenToWorld()
    SetNuiFocus(false, false)

    if hit == 1 and entityType == 1 then
        local amount = data.amount

        if tonumber(amount) > 1 then
            amount = tostring(exports["soz-core"]:Input("Quantité", 5, data.amount))
            if tonumber(amount, 10) == nil then
                exports["soz-core"]:DrawNotification("Vous devez entrer un nombre entier", "error")
                cb(true)
                return
            end
        end

        if amount and tonumber(amount) > 0 then
            local playerIdx = NetworkGetPlayerIndexFromPed(entityHit)
            if playerIdx == -1 then -- Is NPC
                if currentResellZone ~= nil then
                    TriggerServerEvent("inventory:server:ResellItem", data, tonumber(amount), currentResellZone)
                else
                    exports["soz-core"]:DrawNotification("Vous n'êtes pas dans une zone de revente", "error")
                end
            else
                local playerState = exports["soz-core"]:GetPlayerState()

                if playerState.isInHub then
                    exports["soz-core"]:DrawNotification("Pas d'échange dans le Hub", "error")
                else
                    TriggerServerEvent("inventory:server:GiveItem", GetPlayerServerId(playerIdx), data, tonumber(amount))
                end
            end
        end
    else
        local printers = {
            [GetHashKey("prop_printer_01")] = true,
            [GetHashKey("prop_printer_02")] = true,
            [GetHashKey("v_res_printer")] = true,
            [GetHashKey("v_med_cor_photocopy")] = true,
            [GetHashKey("prop_copier_01")] = true,
        }
        if printers[GetEntityModel(entityHit)] then
            TriggerServerEvent("soz-core:server:police:make-copy-detective-board", data)
            cb(true)
            return
        end
        if data.type == "evidence" and data.name ~= "scientist_photo" then
            TriggerEvent("soz-core:client:police:analyze-evidence", data, {endCoords.x, endCoords.y, endCoords.z})
            cb(true)
            return
        end
        exports["soz-core"]:DrawNotification("Personne n'est à portée de vous", "error")
    end

    cb(true)
end)

RegisterNUICallback("player/addPhotoDetectiveBoard", function(data, cb)
    TriggerServerEvent("soz-core:server:police:add-photo-detective-board", data.detectiveBoard, data.photo)
    cb(true)
end)

RegisterNUICallback("player/giveMoneyToTarget", function(data, cb)
    local hit, _, _, entityHit, entityType, _ = ScreenToWorld()
    SetNuiFocus(false, false)

    local playerState = exports["soz-core"]:GetPlayerState()

    if playerState.isInHub then
        exports["soz-core"]:DrawNotification("Pas d'échange dans le Hub", "error")
    else
        if hit == 1 and entityType == 1 then
            local amount = exports["soz-core"]:Input("Quantité", 12)

            if amount and tonumber(amount) > 0 then
                local playerIdx = NetworkGetPlayerIndexFromPed(entityHit)
                if playerIdx == -1 then -- Is NPC
                    exports["soz-core"]:DrawNotification("Personne n'est à portée de vous", "error")
                else
                    TriggerServerEvent("inventory:server:GiveMoney", GetPlayerServerId(playerIdx), "money", math.ceil(tonumber(amount)))
                end
            end
        else
            exports["soz-core"]:DrawNotification("Personne n'est à portée de vous", "error")
        end
    end

    cb(true)
end)

exports("hasPhone", function()
    if IsPauseMenuActive() then
        return false
    end

    local hasphone = false
    for _, item in pairs(PlayerData.items) do
        if item.name == "phone" then
            hasphone = true
            break
        end
    end

    if not hasphone then
        exports["soz-core"]:DrawNotification("Vous n'avez pas de téléphone", "error");
        return false
    end

    local playerState = exports["soz-core"]:GetPlayerState()

    if playerState.isInventoryBusy then
        exports["soz-core"]:DrawNotification("Action en cours", "error")
        return false
    end

    if PlayerData.metadata["inlaststand"] or PlayerData.metadata["ishandcuffed"] then
        exports["soz-core"]:DrawNotification("Vous ne pouvez pas accéder à votre téléphone", "error")
        return false
    end

    return true;
end)

RegisterNUICallback("player/openItemStorage", function(data, cb)
    cb(true)
    SetNuiFocus(false, false)

    TriggerServerEvent("inventory:server:openItemStorage", data.slot)
end)

RegisterNUICallback("player/showItem", function(data, cb)
    cb(true)

    local player, distance = QBCore.Functions.GetClosestPlayer()
    if player ~= -1 and distance < 2.0 then
        TriggerServerEvent("soz-core:server:inventory:item-show", GetPlayerServerId(player), data.slot)
    else
        exports["soz-core"]:DrawNotification("Personne n'est à portée de vous", "error")
    end
end)
