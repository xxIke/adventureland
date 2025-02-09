/**
 * 12 - Merchant Class
 * 
 * Extended Merchant Functionality
 * 
 */
load_code(1, () => { game_log("Failed to load code slot 1 from 12"); });
load_code(2, () => { game_log("Failed to load code slot 2 from 12"); });
load_code(3, () => { game_log("Failed to load code slot 3 from 12"); });
load_code(4, () => { game_log("Failed to load code slot 4 from 12"); });
load_code(5, () => { game_log("Failed to load code slot 5 from 12"); });
load_code(6, () => { game_log("Failed to load code slot 6 from 12"); });
load_code(11, () => { game_log("Failed to load code slot 11 from 12"); });

class Merchant extends Bot {
    constructor() {
        super()
        this.handlerTimeouts.tradeHandler = null;
        this.handlerTimeouts.hunterHandler = null;
        this.handlerTimeouts.restockHandler = null;

        this.config.tradeHandlerTimeout = 1000;
        this.config.hunterHandlerTimeout = 5 * 60 * 1000;
        this.config.restockHandlerTimeout = 5 * 60 * 1000;
    }

    init() {
        super.init();
        this.logger.dLog(debugLogLevels.controlFlow0, "Merchant.init()");

        this.handlerTimeouts.tradeHandler = setTimeout(() => { this.tradeHandler(); }, this.config.tradeHandlerTimeout);
        this.handlerTimeouts.hunterHandler = setTimeout(() => { this.hunterHandler(); }, this.config.hunterHandlerTimeout);
        this.handlerTimeouts.restockHandler = setTimeout(() => { this.restockHandler(); }, this.config.restockHandlerTimeout);

    }

    /**
     * 
     * @param {Object} tradeRequest 
     * @param {String} tradeRequest.name // Name of item
     * @param {String} tradeRequest.rid // unique id?
     * @param {Number} tradeRequest.price // Price
     * @param {Boolean} tradeRequest.b // Is buying
     * @param {Number} tradeRequest.q // Quantity available
     * @param {Number} tradeRequest.level  // item level
     */
    shouldTrade(tradeRequest) {
        // TODO - determine better trade logic based on surplus items and wishlisted items
        // They're selling
        if (!tradeRequest.b) {
            if ((item_value(tradeRequest) * 0.5) < tradeRequest.price) {
                let maxQ = Math.floor(character.gold / tradeRequest.price)
                return maxQ < tradeRequest.q ? maxQ : tradeRequest.q
            }
        }
        // They're buying
        else {
            let indexes = findInventoryIndexes(tradeRequest);
            // I don't have it to sell to them
            if (indexes.length < 1) return 0;
            // They're buying at 2x the market rate
            if ((2 * item_value(tradeRequest)) > tradeRequest.price) {
                // If this is a stackable item return appropriate stack size else return how many you have
                let maxQ = indexes[0].q ? indexes[0].q < tradeRequest.q ? indexes[0].q : tradeRequest.q : indexes.length
                return maxQ
            }
        }

        return false;
    }

    tradeHandler() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Merchant.tradeHandler()")

        // Examine the nearby players offering trades
        for (let current of this.trackedEntities.playersOfferingTrade) {
            for (let slot in current.slots) {
                if (!current.slots[slot] || !slot.includes("trade")) {
                    // Not a trade slot or it's empty
                    continue;
                }
                else {
                    // If I should trade
                    let q = this.shouldTrade(current.slots[slot]);
                    if (q > 0) {
                        // They're buying, I'm selling
                        if (current.slots[slot].b) {
                            trade_sell(current, slot, q);
                        }
                        // They're selling, I'm buying
                        else {
                            trade_buy(current, slot, q);
                        }
                    }
                }
            }
        }

        this.handlerTimeouts.tradeHandler = setTimeout(() => { this.tradeHandler(); }, this.config.tradeHandlerTimeout);
    }

    hunterHandler() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Merchant.hunterHandler()");

        // TODO - Determine priority hunt target
        let priorityTarget = G.maps.main.monsters[23] // 23 - Snakes
        // Update local storage with hunt target
        set(localStorageVariables.huntTarget, JSON.stringify(priorityTarget))
        this.handlerTimeouts.hunterHandler = setTimeout(() => { this.hunterHandler(); }, this.config.hunterHandlerTimeout);
    }

    restockHandler() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Merchant.restockHandler()");

        // Check hunter inventory backups
        // If anyone is low on potions, or I can pickup > 20 items
        let activeCharacterNames = getActiveCharacterNames()
        let junkCount = 0;
        for (let name in activeCharacterNames) {
            if (character.name == name) continue;
            let inv = get(name + "_inv")
            if (!inv) continue;
            inv = JSON.parse(inv)
            for (let item of inv) {
                if (!item || item.name.includes("stand") || item.name.includes("tracker")) {
                    continue;
                }
                if (item.name.includes("pot") && item.q < 500) {
                    this.botStates.restock.stateData.shouldRestock = true
                }
                junkCount += 1
            }
        }

        if (junkCount >= 20) {
            this.botStates.restock.stateData.shouldRestock = true
        }

        this.handlerTimeouts.restockHandler = setTimeout(() => { this.restockHandler(); }, this.config.restockHandlerTimeout);
    }

    merchantsLuckHandler() {
        // TODO - implement this
        // Character doesn't currently meet level requirements

    }

    merchantsCourageHandler() {
        // TODO - implement this
        // Character doesn't currently meet level requirements

    }

    merchantsFrenzyHandler() {
        // TODO - implement this
        // Character doesn't currently meet level requirements

    }

    throwStuffHandler() {
        // TODO - implement this
        // Character doesn't currently meet level requirements

    }

    skillHandler() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Merchant.skillHandler()")

        this.logger.dLog(debugLogLevels.error, "No skills to impelement currently, disabling handler");
        // this.handlerTimeouts.skillHandler = setTimeout(() => { this.skillHandler(); }, this.config.skillHandlerTimeout);
    }

    stateHandlerIdle() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Merchant Idle Handler")
        let ret = {
            nextState: this.botStates.invMgmt,
            nextUse: 50
        }

        super.stateHandlerIdle()

        return ret
    }

    stateHandlerFollow() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Merchant Follow Handler")
        // Not sure if the Merchant will really use this or not

        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        // TODO - How should I even break out of this?

        return ret
    }

    stateHandlerTransition() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Merchant Transition Handler")
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        // TODO - I think my new design has obsoleted the need for a transition state?

        return ret
    }

    stateHandlerEvade() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Merchant Evade Handler")
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        // TODO - I'm not sure that merchant needs this state?

        return ret
    }

    stateHandlerRecover() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Merchant Recover Handler")
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        // TODO - I believe this as a state isn't relevant to the Merchant as they should recover along side upgrade/compound in order to keep going

        return ret
    }

    stateHandlerInvMgmt() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Merchant InvMgmt Handler")
        let ret = {
            nextState: this.botStates.invMgmt,
            nextUse: 1000
        }
        if (character.stand) close_stand();

        // 1. Move to bank, read bank items into item catalogue
        const bank = {
            x: 0,
            y: -70,
            map: "bank"
        }
        // 1.1 If I'm not yet in the bank, return (wait)
        if (this.moveManager.move(moveLocations.bank) !== moveReturnCodes.moveComplete) return ret;
        // I'm stationary, keep my stand open
        if (!character.stand) open_stand();
        // 1.2 I am in the bank, create the item catalogue
        depositJunkInBank();
        let itemCatalogue = {}

        for (let vault in character.bank) {
            if (bank == "gold") {
                itemCatalogue["gold"] = { q: character.bank[vault] }
            }
            else {
                for (let item of character.bank[vault]) {
                    if (!item) continue;
                    if (!itemCatalogue[item.name]) {
                        itemCatalogue[item.name] = {
                            q: 0,
                            countByLevel: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                        }
                    }
                    itemCatalogue[item.name].q += 1
                    if (item.level !== undefined) itemCatalogue[item.name].countByLevel[item.level] += 1
                }
            }
        }


        // TODO 
        // Create wishlist based on current gear -> purchase what you can

        let forUpgrade = []
        let forCompound = []
        let forSale = []
        // Check for items to sell/upgrade/compound
        for (let itemName in itemCatalogue) {
            if ((itemName == "gold")) continue;
            if (this.botStates.invMgmt.stateData.toSell.includes(itemName)) {
                let sellEntry = {
                    name: itemName,
                    level: 0
                }

                for (let level in itemCatalogue[itemName].countByLevel) {
                    if (itemCatalogue[itemName].countByLevel[level] > 0) {
                        sellEntry.level = level
                        while (itemCatalogue[itemName].countByLevel[level] > 0) {
                            forSale.push(sellEntry)
                            itemCatalogue[itemName].countByLevel[level] -= 1;
                        }
                    }
                }
            }
            else if (G.items[itemName].upgrade) {
                // if highest level, q > 2 or not highest level
                let highestLevel = -1
                for (let level in itemCatalogue[itemName].countByLevel) {
                    if (itemCatalogue[itemName].countByLevel[level] > 0) {
                        highestLevel = level
                    }
                }

                let upgradeEntry = {
                    name: itemName,
                    level: 0
                }

                for (let level = 0; level <= highestLevel; level++) {
                    if ((level == highestLevel) && (itemCatalogue[itemName].countByLevel[level] < 2)) {
                        continue;
                    }

                    if (itemCatalogue[itemName].countByLevel[level] > 0) {
                        upgradeEntry.level = level
                        let grade = item_grade(upgradeEntry)
                        if ((grade > 1) || ((grade > 0) && (itemCatalogue["gold"] < 100000000))) continue;
                        forUpgrade.push(upgradeEntry)
                        itemCatalogue["gold"] -= G.items["scroll" + grade].g

                    }
                }

            }
            else if (G.items[itemName].compound) {
                let highestLevel = -1
                for (let level in itemCatalogue[itemName].countByLevel) {
                    if (itemCatalogue[itemName].countByLevel[level] > 0) {
                        highestLevel = level
                    }
                }

                let compoundEntry = {
                    name: itemName,
                    level: 0
                }

                for (let level = 0; level <= highestLevel; level++) {
                    if ((level == highestLevel) && (itemCatalogue[itemName].countByLevel[level] < 4)) {
                        continue;
                    }

                    if (itemCatalogue[itemName].countByLevel[level] > 2) {
                        compoundEntry.level = level
                        let grade = item_grade(compoundEntry)
                        if ((grade > 1) || ((grade > 0) && (itemCatalogue["gold"] < 100000000))) continue
                        forCompound.push(compoundEntry)
                        itemCatalogue["gold"] -= G.items["cscroll" + grade].g
                    }
                }
            }
        }

        // Grab items for sale
        for (let item of forSale) {
            retrieveItemFromBank(item)
        }

        for (let item of forSale) {
            if (!character.stand) open_stand()
            let itemIndex = findInventoryIndexes(item)
            if (itemIndex.length > 0) {
                itemIndex = itemIndex[0];
                let freeStandIndex = findEmptyTradeSlot()
                if (freeStandIndex) {
                    trade(itemIndex, freeStandIndex, 0.75 * item_value(item), 1);
                }
            }
        }

        // Grab some money for scrolls/potions
        let neededGold = 20 * 1000 + 100 * 1000
        for (let item of forUpgrade) {
            let grade = item_grade(item)
            neededGold += G.items["scroll" + grade].g
        }
        for (let item of forCompound) {
            let grade = item_grade(item)
            neededGold += G.items["cscroll" + grade].g
        }
        bank_withdraw(neededGold)

        // Next state = Restock? Upgrade? Compound? Wander

        this.botStates.invMgmt.stateData.itemCatalogue = { ...itemCatalogue }
        this.botStates.invMgmt.stateData.forUpgrade = [...forUpgrade]
        this.botStates.invMgmt.stateData.forCompound = [...forCompound]
        this.botStates.invMgmt.stateData.forSale = [...forSale]

        if (this.botStates.restock.stateData.shouldRestock) {
            ret.nextState = this.botStates.restock
            ret.nextUse = 500
        }
        else if (this.botStates.invMgmt.stateData.forUpgrade.length > 0) {
            ret.nextState = this.botStates.upgrade
            ret.nextUse = 500
        }
        else if (this.botStates.invMgmt.stateData.forCompound.length > 0) {
            ret.nextState = this.botStates.compound
            ret.nextUse = 500
        }
        else {
            ret.nextState = this.botStates.wander
            ret.nextUse = 500
        }
        if (character.stand) close_stand()
        return ret
    }

    stateHandlerUpgrade() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Merchant Upgrade Handler")
        let ret = {
            nextState: this.botStates.upgrade,
            nextUse: this.currentState.defaultTimeout // This should become time to regen needed mana
        }

        // Acquire items to upgrade from bank
        let itemToUpgrade = null
        if (!this.botStates.upgrade.stateData.haveItem) {
            if (this.moveManager.move(moveLocations.bank) !== moveReturnCodes.moveComplete) {
                return ret;
            }
            else {
                while (this.botStates.invMgmt.stateData.forUpgrade.length > 0) {
                    itemToUpgrade = this.botStates.invMgmt.stateData.forUpgrade.pop()
                    if (itemToUpgrade && (retrieveItemFromBank(itemToUpgrade) > 0)) {
                        this.botStates.upgrade.stateData.haveItem = true;
                        break;
                    }
                }

                if (!this.botStates.upgrade.stateData.haveItem) {
                    ret.nextState = this.botStates.invMgmt;
                    ret.nextUse = 500;
                    return ret;
                }
            }
        }

        // Move to upgrade NPC

        if (this.botStates.upgrade.stateData.haveItem && (this.moveManager.move(moveLocations.upgradeLocation) !== moveReturnCodes.moveComplete)) return ret;
        // Purchase needed scrolls/regen needed mana
        let scroll = "scroll" + item_grade(itemToUpgrade);
        if (!this.botStates.upgrade.stateData.haveScroll) {
            buy(scroll).then(
                (resolve) => {
                    this.logger.iLog(infoLogLevels.info, "Purchased Scroll: " + JSON.stringify(resolve))
                    this.botStates.upgrade.stateData.haveScroll = true
                },
                (reject) => {
                    this.logger.iLog(infoLogLevels.error, "Failed to buy Scroll: " + JSON.stringify(reject))
                    this.botStates.upgrade.stateData.haveItem = false
                    this.botStates.upgrade.stateData.haveScroll = false
                    this.botStates.upgrade.stateData.haveUpgraded = false
                }
            ).catch(
                (error) => {
                    this.logger.dLog(debugLogLevels.fatal, "Failure buying scroll: " + JSON.stringify(error))
                    this.botStates.upgrade.stateData.haveItem = false
                    this.botStates.upgrade.stateData.haveScroll = false
                    this.botStates.upgrade.stateData.haveUpgraded = false
                })
        }

        // Perform upgrade
        if (!this.botStates.upgrade.stateData.haveUpgraded && this.botStates.upgrade.stateData.haveScroll) {
            let scrollIndex = findInventoryIndexes({ name: scroll })
            let itemIndex = findInventoryIndexes(itemToUpgrade)
            if (scrollIndex.length > 0) scrollIndex = scrollIndex[0]
            else {
                return ret;
            }
            if (itemIndex.length > 0) itemIndex = itemIndex[0];
            else {
                // Something went wrong and I don't actually have the item?
                this.logger.dLog(debugLogLevels.error, "Tried to upgrade none existant item")
            }
            // TODO - Use production skill
            upgrade(itemIndex, scrollIndex).then(
                (resolve) => {
                    this.logger.iLog(infoLogLevels.info("Upgrade success: " + JSON.stringify(resolve)))
                    this.botStates.upgrade.stateData.haveItem = false
                    this.botStates.upgrade.stateData.haveScroll = false
                    this.botStates.upgrade.stateData.haveUpgraded = false
                },
                (reject) => {
                    this.logger.iLog(infoLogLevels.warn("Failed to upgrade: " + JSON.stringify(reject)))
                    this.botStates.upgrade.stateData.haveItem = false
                    this.botStates.upgrade.stateData.haveScroll = false
                    this.botStates.upgrade.stateData.haveUpgraded = false
                }
            ).catch(
                (error) => {
                    this.logger.dLog(debugLogLevels.fatal, "Failure upgrading: " + JSON.stringify(error))
                    this.botStates.upgrade.stateData.haveItem = false
                    this.botStates.upgrade.stateData.haveScroll = false
                    this.botStates.upgrade.stateData.haveUpgraded = false
                }
            )
            this.botStates.upgrade.stateData.haveUpgraded = true
            if (character.q.upgrade) ret.nextUse = character.q.upgrade.ms
            else ret.nextUse = 1000
            ret.nextState = this.botStates.upgrade
            return ret
        }

        // If I've gotten this far, but I'm still showing as haveItem, then I need to finish this upgrade process
        if (this.botStates.upgrade.stateData.haveItem) {
            if (character.q.upgrade) ret.nextUse = character.q.upgrade.ms
            else ret.nextUse = 1000
            ret.nextState = this.botStates.upgrade
            return ret
        }
        else {
            ret.nextState = this.botStates.invMgmt
            ret.nextUse = 500
        }

        return ret
    }

    stateHandlerCompound() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Merchant Compound Handler")
        let ret = {
            nextState: this.botStates.compound,
            nextUse: this.botStates.compound.defaultTimeout // This should become time to regen needed mana
        }

        // Acuire items to compound from bank
        let itemToCompound = null
        if (!this.botStates.compound.stateData.haveItems) {
            if (this.moveManager.move(moveLocations.bank) !== moveReturnCodes.moveComplete) {
                return ret;
            }
            else {
                while (this.botStates.invMgmt.stateData.forCompound.length > 0) {
                    itemToCompound = this.botStates.invMgmt.stateData.forCompound.pop()
                    if (itemToCompound && (retrieveItemFromBank(itemToCompound, 3) > 2)) {
                        this.botStates.compound.stateData.haveItems = true;
                        break;
                    }
                }

                if (!this.botStates.compound.stateData.haveItems) {
                    ret.nextState = this.botStates.invMgmt;
                    ret.nextUse = 500;
                    return ret;
                }
            }
        }
        // Move to compound NPC
        if (this.botStates.compound.stateData.haveItems && (this.moveManager.move(moveLocations.upgradeLocation) !== moveReturnCodes.moveComplete)) return ret;
        // Purchase neede scrolls/regen needed mana
        let scroll = "cscroll" + item_grade(itemToUpgrade);
        if (!this.botStates.compound.stateData.haveScroll) {
            buy(scroll).then(
                (resolve) => {
                    this.logger.iLog(infoLogLevels.info, "Purchased Scroll: " + JSON.stringify(resolve))
                    this.botStates.compound.stateData.haveScroll = true
                },
                (reject) => {
                    this.logger.iLog(infoLogLevels.error, "Failed to buy Scroll: " + JSON.stringify(reject))
                    this.botStates.compound.stateData.haveItems = false
                    this.botStates.compound.stateData.haveScroll = false
                    this.botStates.compound.stateData.haveCompounded = false
                }
            ).catch(
                (error) => {
                    this.logger.dLog(debugLogLevels.fatal, "Failure buying scroll: " + JSON.stringify(error))
                    this.botStates.compound.stateData.haveItems = false
                    this.botStates.compound.stateData.haveScroll = false
                    this.botStates.compound.stateData.haveCompounded = false
                })
        }

        // Perform Compound
        if (!this.botStates.compound.stateData.haveCompounded && this.botStates.compound.stateData.haveScroll) {
            let scrollIndex = findInventoryIndexes({ name: scroll })
            let itemIndex = findInventoryIndexes(itemToCompound)
            if (scrollIndex.length > 0) scrollIndex = scrollIndex[0]
            else {
                return ret;
            }
            if (itemIndex.length < 3) {
                this.logger.dLog(debugLogLevels.error, "Tried to compound without enough items")
            }

            compound(itemIndex[0], itemIndex[1], itemIndex[2], scrollIndex).then(
                (resolve) => {
                    this.logger.iLog(infoLogLevels.info("Compound success: " + JSON.stringify(resolve)))
                    this.botStates.compound.stateData.haveItems = false
                    this.botStates.compound.stateData.haveScroll = false
                    this.botStates.compound.stateData.haveCompounded = false
                },
                (reject) => {
                    this.logger.iLog(infoLogLevels.warn("Failed to compound: " + JSON.stringify(reject)))
                    this.botStates.compound.stateData.haveItems = false
                    this.botStates.compound.stateData.haveScroll = false
                    this.botStates.compound.stateData.haveCompounded = false
                }
            ).catch(
                (error) => {
                    this.logger.dLog(debugLogLevels.fatal, "Failure compounding: " + JSON.stringify(error))
                    this.botStates.compound.stateData.haveItems = false
                    this.botStates.compound.stateData.haveScroll = false
                    this.botStates.compound.stateData.haveCompounded = false
                }
            )
            this.botStates.compound.stateData.haveCompounded = true
            if (character.q.compound) ret.nextUse = character.q.compound.ms
            else ret.nextUse = 1000
            ret.nextState = this.botStates.compound
            return ret
        }

        if (this.botStates.compound.stateData.haveItems) {
            if (character.q.compound) ret.nextUse = character.q.compound.ms
            else ret.nextUse = 1000
            ret.nextState = this.botStates.compound
            return ret
        }
        else {
            ret.nextState = this.botStates.invMgmt
            ret.nextUse = 500
        }

        return ret
    }

    stateHandlerRestock() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Merchant Restock Handler")
        let ret = {
            nextState: this.botStates.restock,
            nextUse: this.botStates.restock.defaultTimeout
        }
        if (character.stand) close_stand()
        if (!this.botStates.restock.stateData.haveBankItems) {

            // Move to bank
            if (this.moveManager.move(moveLocations.bank) !== moveReturnCodes.moveComplete) {
                ret.nextUse = 2000
                return ret;
            }
            // Get needed items/gold for needed potions
            else {
                // TODO - Wishlist manager
                let neededGold = 80 * 1000 + 400 * 1000
                if (character.gold < neededGold) bank_withdraw(neededGold)
                this.botStates.restock.stateData.haveBankItems = true
            }
        }
        // Buy missing potions
        if (!this.botStates.restock.stateData.havePotions) {
            if (this.moveManager.move(moveLocations.upgradeLocation) !== moveReturnCodes.moveComplete) {
                ret.nextUse = 2000
                return ret;
            }
            else {
                for (let potion in potions) {
                    if (potion.includes("x") || potion.includes("regen")) continue;
                    let potionIndex = findInventoryIndexes({ name: potion })
                    let potionCount = potionIndex.length > 0 ? character.items[potionIndex[0]].q : 0
                    // TODO - buy ammount needed
                    if (potionCount < 4000) {
                        buy(potion, 4000 - potionCount)
                    }
                }
                this.botStates.restock.stateData.havePotions = true
            }
        }

        // Move to party location
        if (!this.botStates.restock.stateData.resuppliedParty) {
            let monsterHuntTarget = get(localStorageVariables.monsterHuntTarget)
            if (monsterHuntTarget) {
                monsterHuntTarget = JSON.parse(monsterHuntTarget)
            }
            let huntTarget = get(localStorageVariables.huntTarget)
            if (huntTarget) {
                huntTarget = JSON.parse(huntTarget)
            }

            let hunterPartyTarget = null
            if (monsterHuntTarget.type) {
                hunterPartyTarget = {
                    x: monsterHuntTarget.boundary[0],
                    y: monsterHuntTarget.boundary[0],
                    map: monsterHuntTarget.map
                }
            }
            else {
                hunterPartyTarget = {
                    x: huntTarget.boundary[0],
                    y: huntTarget.boundary[0],
                    map: huntTarget.map
                }
            }

            if (this.moveManager.move(hunterPartyTarget) !== moveReturnCodes.moveComplete) {
                ret.nextUse = 5000
                return ret
            }
            else {
                // TODO - fullfill wishlists
                // Resupply
                if (!character.stand) open_stand()
                for (let player of this.trackedEntities.partyMembers) {
                    if (player.owner != character.owner) continue;
                    for (let slot of player.slots) {
                        if (!slot.includes("trade")) continue;
                        let tradeRequest = player.slot[slot]
                        if (!tradeRequest || !tradeRequest.b || (findInventoryIndexes(tradeRequest).length < 1)) continue
                        trade_sell(player, slot, tradeRequest.q || 1)
                    }
                }
                this.botStates.restock.stateData.resuppliedParty = true;
            }
        }

        // Take junk
        if (!this.botStates.restock.stateData.haveJunk) {
            if (!character.stand) open_stand()
            ret.nextState = this.botStates.restock
            ret.nextUse = 2000;
            this.botStates.restock.stateData.haveJunk = true
            return ret
        }
        // Deposit junk in bank
        else {
            if (this.moveManager.move(moveLocations.bank) !== moveReturnCodes.moveComplete) {
                ret.nextState = this.botStates.restock
                ret.nextUse = 5000;
                return ret
            }
            else {
                depositJunkInBank()
                this.botStates.restock.stateData.shouldRestock = false
                this.botStates.restock.stateData.haveBankItems = false
                this.botStates.restock.stateData.havePotions = false
                this.botStates.restock.stateData.resuppliedParty = false
                this.botStates.restock.stateData.haveJunk = false
                this.restockHandler()
            }
        }

        // Resupply ? InvMgmt
        if (this.botStates.restock.stateData.shouldRestock) {
            ret.nextState = this.botStates.restock
            ret.nextUse = 1000
        }
        else {
            ret.nextState = this.botStates.invMgmt
            ret.nextUse = 1000
        }

        return ret
    }

    stateHandlerWander() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Merchant Wander Handler")
        let ret = {
            nextState: this.botStates.wander,
            nextUse: this.botStates.wander.defaultTimeout
        }
        if (character.stand) close_stand()

        // TODO - For now just sell overflow to ponty, eventually this should be wandering groups of hunters and mining/fishing spots
        const wanderLocation = this.botStates.wander.stateData.wanderRoute[this.botStates.wander.stateData.wanderIndex]
        if (this.moveManager.move(wanderLocation.location) !== moveReturnCodes.moveComplete) {
            return ret;
        }
        else {
            if (!character.stand) open_stand()
            switch (wanderLocation.action) {
                case "sell":
                    // Sell to Ponty
                    for (let slot in character.slots) {
                        if (!slot.includes("trade") || !character.slots[slot]) continue;
                        let tradeRequest = character.slots[slot]
                        if (this.botStates.invMgmt.stateData.toSell.includes(tradeRequest.name)) {
                            unequip(slot)
                            let index = findInventoryIndexes(tradeRequest)
                            if (index.length < 1) {
                                ret.nextState = this.botStates.wander
                                ret.nextUse = 50
                                return ret
                            }
                            else {
                                index = index[0]
                            }
                            sell(index, tradeRequest.q || 1)
                        }
                    }
                    // TODO Reset Trade Requests
                    break;

                default:
                    break;
            }
            if (character.stand) close_stand()
        }
        return ret
    }

    stateHandlerEvent() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Merchant Event Handler")
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }
}