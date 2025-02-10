/**
 * 11 - Bot Class
 * 
 * Base functionality for all bots
 * 
 */

load_code(2, () => { game_log("Failed to load code slot 2 from 11"); });
load_code(3, () => { game_log("Failed to load code slot 3 from 11"); });
load_code(4, () => { game_log("Failed to load code slot 4 from 11"); });
load_code(5, () => { game_log("Failed to load code slot 5 from 11"); });
load_code(6, () => { game_log("Failed to load code slot 6 from 11"); });

class Bot {
    constructor() {
        this.config = {
            potionHandlerTimeout: 500, // Default value for next call to potionHandler
            entityHandlerTimeout: 500, // Default value for next call to entityHandler
            localStorageHandlerTimeout: 30 * 1000, // Default value for next call to localStorageHandler
            skillHandlerTimeout: 1000, // Default value for next call to skillHandler
            stateHandlerTimeout: 1000, // Default value for next call to stateHandler
        }

        // Each timeout the bot is currently tracking
        this.handlerTimeouts = {
            potionHandler: null,
            entityHandler: null,
            localStorageHandler: null,
            skillHandler: null,
            stateHandler: null,
        }

        this.botStates = {
            // Universal States
            idle: {
                stateName: "idle",
                stateData: {
                    attemptedBackup: false,
                },
                lastUpdate: undefined,
                stateHandler: this.stateHandlerIdle.bind(this),
                defaultTimeout: 60 * 1000
            },
            follow: {
                stateName: "follow",
                stateData: {
                    followTarget: undefined
                },
                lastUpdate: undefined,
                stateHandler: this.stateHandlerFollow.bind(this),
                defaultTimeout: 60 * 1000
            },
            transition: {
                stateName: "transition",
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerTransition.bind(this),
                defaultTimeout: 60 * 1000
            },
            evade: {
                stateName: "evade",
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerEvade.bind(this),
                defaultTimeout: 60 * 1000
            },
            recover: {
                stateName: "recover",
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerRecover.bind(this),
                defaultTimeout: 60 * 1000
            },
            // Merchant States
            invMgmt: {
                stateName: "invMgmt",
                stateData: {
                    itemCatalogue: {},
                    forUpgrade: [],
                    forCompound: [],
                    forSale: [],
                    toSell: ["hpbelt", "hpamulet"]
                },
                lastUpdate: undefined,
                stateHandler: this.stateHandlerInvMgmt.bind(this),
                defaultTimeout: 10 * 1000
            },
            upgrade: {
                stateName: "upgrade",
                stateData: {
                    haveItem: false,
                    haveScroll: false,
                    haveUpgraded: false,
                },
                lastUpdate: undefined,
                stateHandler: this.stateHandlerUpgrade.bind(this),
                defaultTimeout: 10 * 1000
            },
            compound: {
                stateName: "compound",
                stateData: {
                    haveItems: false,
                    haveScroll: false,
                    haveCompounded: false,
                },
                lastUpdate: undefined,
                stateHandler: this.stateHandlerCompound.bind(this),
                defaultTimeout: 10 * 1000
            },
            restock: {
                stateName: "restock",
                stateData: {
                    shouldRestock: false,
                    haveBankItems: false,
                    havePotions: false,
                    resuppliedParty: false,
                    haveJunk: false,
                },
                lastUpdate: undefined,
                stateHandler: this.stateHandlerRestock.bind(this),
                defaultTimeout: 10 * 1000
            },
            wander: {
                stateName: "wander",
                stateData: {
                    wanderParties: false,
                    wanderServers: false,
                    wanderMining: false,
                    wanderFishing: false,
                    wanderRoute: [{ location: moveLocations.upgradeLocation, action: "sell" }],
                    wanderIndex: 0,
                },
                lastUpdate: undefined,
                stateHandler: this.stateHandlerWander.bind(this),
                defaultTimeout: 10 * 1000
            },
            // Hunter States
            monsterHunt: {
                stateName: "monsterHunt",
                stateData: {
                    "type": "goo",
                    "boundary": [
                        -282,
                        702,
                        218,
                        872
                    ],
                    "count": 9,
                    "grow": true
                },
                lastUpdate: undefined,
                stateHandler: this.stateHandlerMonsterHunt.bind(this),
                defaultTimeout: 60 * 1000
            },
            huntTarget: {
                stateName: "huntTarget",
                stateData: {
                    "type": "goo",
                    "boundary": [
                        -282,
                        702,
                        218,
                        872
                    ],
                    "count": 9,
                    "grow": true
                },
                lastUpdate: undefined,
                stateHandler: this.stateHandlerHuntTarget.bind(this),
                defaultTimeout: 60 * 1000
            },
            event: {
                stateName: "event",
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerEvent.bind(this),
                defaultTimeout: 60 * 1000
            },
        }

        // Information about the current bot state
        this.currentState = this.botStates.idle

        // Entitiy information of note
        this.trackedEntities = {
            attackTarget: null,
            healTarget: null,
            specialMonsters: [],
            targetMonsters: [],
            easyMonsters: [],
            hostileMonsters: [],
            hostilePlayers: [],
            partyMembers: [],
            playersOfferingTrade: [],
        }

        // Custom log functionality
        this.logger = new Logger()

        // Custom move functionality
        this.moveManager = new MoveManger()
    }

    /**
     * Starts all bot timeouts
     */
    init() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Bot.init()")
        this.handlerTimeouts.potionHandler = setTimeout(() => { this.potionHandler(); }, this.config.potionHandlerTimeout);
        this.handlerTimeouts.entityHandler = setTimeout(() => { this.entityHandler(); }, this.config.entityHandlerTimeout);
        this.handlerTimeouts.localStorageHandler = setTimeout(() => { this.localStorageHandler(); }, this.config.localStorageHandlerTimeout);
        this.handlerTimeouts.skillHandler = setTimeout(() => { this.skillHandler(); }, this.config.skillHandlerTimeout);
        this.handlerTimeouts.stateHandler = setTimeout(() => { this.stateHandler(); }, this.config.stateHandlerTimeout);
    }

    softStop() {

    }

    hardStop() {

    }

    setFollow() {

    }

    /**
     * Determines priority of recovering mana and what potion (if any) to use
     * @returns 
     */
    determineManaPriority() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Bot.determineManaPriority()")
        let ret = {
            priority: potPriority.na,
            potion: potions.regenMp
        };
        let missingMana = character.max_mp - character.mp

        // TODO - improve logic to determine priority and select potion
        if (missingMana > 10000) {
            ret.priority = potPriority.high;
            ret.potion = potions.mpotx;
        }
        else if (missingMana > 1000) {
            ret.priority = potPriority.medium;
            ret.potion = potions.mpot1;
        }
        else if (missingMana > 500) {
            ret.priority = potPriority.low;
            ret.potion = potions.mpot0;
        }
        else if (missingMana > 100) {
            ret.priority = potPriority.low;
            ret.potion = potions.regenMp;
        }

        return ret;
    }

    /**
     * Determines priority of recovering health and what potion (if any) to use
     * @returns 
     */
    determineHealthPriority() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Bot.determineHealthPriority()")
        let ret = {
            priority: potPriority.low,
            potion: potions.regenHp
        };

        let missingHp = character.max_hp - character.hp

        // TODO - improve logic to determine priority and select potion
        if (missingHp > 10000) {
            ret.priority = potPriority.high;
            ret.potion = potions.hpotx;
        }
        else if (missingHp > 800) {
            ret.priority = potPriority.medium;
            ret.potion = potions.hpot1;
        }
        else if (missingHp > 400) {
            ret.priority = potPriority.low;
            ret.potion = potions.hpot0;
        }
        else if (missingHp > 50) {
            ret.priority = potPriority.low;
            ret.potion = potions.regenHp;
        }

        return ret;
    }

    /**
     * Handler for prioritizing and using potions
     */
    potionHandler() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Bot.potionHandler()")
        let healthPriority = this.determineHealthPriority();
        let manaPriority = this.determineManaPriority();
        let nextUse = this.config.potionHandlerTimeout;

        if (healthPriority.priority !== potPriority.na && manaPriority.priority !== potPriority.na) {
            if (healthPriority.priority > manaPriority.priority) {
                usePotion(healthPriority.potion);
            }
            else {
                usePotion(manaPriority.potion);
            }

            nextUse = parent.next_skill.use_hp - Date.now();
        }

        this.handlerTimeouts.potionHandler = setTimeout(() => { this.potionHandler(); }, nextUse > 50 ? nextUse : 50);
    }

    /**
     * Check current entities list and stores ones of note in this.trackedEntities
     */
    surveyNearbyEntities() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Bot.surveyNearbyEntities()")
        let specialMonsters = [];
        let targetMonsters = [];
        let easyMonsters = [];
        let hostileMonsters = [];
        let hostilePlayers = [];
        let partyMembers = [];
        let playersOfferingTrade = [];

        for (let id in parent.entities) {
            let current = parent.entities[id]
            if ((!current.visible) || current.dead || current.rip || (current.type == "npc")) continue;

            // Process characters
            if (current.type == "character") {
                // This is (or should be) a party member
                if ((character.owner == current.owner) || character.party && (character.party == current.party)) {
                    partyMembers.push(current)
                }
                // This is someone targeting our party
                else if (current.target && (current.target == character.name || this.trackedEntities.partyMembers.some(member => member.name === current.target))) {
                    // TODO - possible bug in this logic as healing will set a character's target field
                    // In theory friendlies should have already been caught by the first if, but friends approaching to form a party could register here
                    hostilePlayers.push(current)
                }

                // I only want my 'merchant' worried about trading with others
                if (character.ctype == "merchant") {
                    for (let slot in current.slots) {
                        if (!current.slots[slot] || !slot.includes("trade")) {
                            // Not a trade slot or it's empty
                            continue;
                        }
                        else {
                            // They have something listed for trade
                            playersOfferingTrade.push(current);
                            break;
                        }
                    }
                }
            }
            // Process Monsters
            else if (current.type == "monster") {
                // My merchant only needs to worry about monsters targeting them
                if (character.ctype == "merchant") {
                    if (current.target == character.name) {
                        hostileMonsters.push(current);
                    }
                    else {
                        continue;
                    }
                }
                // Don't kill the puppies!
                if (current.xp < 0) {
                    continue;
                }

                if (current.target && (current.target == character.name || this.trackedEntities.partyMembers.some(member => member.name === current.target))) {
                    hostileMonsters.push(current);
                }

                if (validSpecialMonsters.includes(current.mtype)) {
                    specialMonsters.push(current);
                }

                let currentTargetType = null
                if (this.currentState.stateData.type) currentTargetType = this.currentState.stateData.type
                if (this.currentState.stateData.mtype) currentTargetType = this.currentState.stateData.mtype

                if (currentTargetType && currentTargetType == current.mtype) {
                    targetMonsters.push(current);
                }

                if (current.hp < character.attack * 0.8) {
                    easyMonsters.push(current);
                }

            }
            else {
                this.logger.dLog(debugLogLevels.fatal, "Encountered unknown type: " + current.type);
            }
        }

        this.trackedEntities.specialMonsters = [...specialMonsters]
        this.trackedEntities.targetMonsters = [...targetMonsters]
        this.trackedEntities.hostileMonsters = [...hostileMonsters]
        this.trackedEntities.easyMonsters = [...easyMonsters]
        this.trackedEntities.hostilePlayers = [...hostilePlayers]
        this.trackedEntities.partyMembers = [...partyMembers]
        this.trackedEntities.playersOfferingTrade = [...playersOfferingTrade]

        let debugMsg = ""
        for (let entitiesArr in this.trackedEntities) {
            if (!this.trackedEntities[entitiesArr]) continue;
            debugMsg += `${entitiesArr}: ${this.trackedEntities[entitiesArr].length}\n`;
        }
        this.logger.dLog(debugLogLevels.controlFlow2, debugMsg)
    }

    entityHandler() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Bot.entityHandler()")
        this.surveyNearbyEntities();

        this.handlerTimeouts.entityHandler = setTimeout(() => { this.entityHandler(); }, this.config.entityHandlerTimeout);
    }

    localStorageHandler() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Bot.localStorageHandler()")
        // Back up Logs
        this.logger.backup();

        // Back up State/Config
        set(localStorageVariables.stateBackup, JSON.stringify(this.botStates))
        set(localStorageVariables.configBackup, JSON.stringify(this.config))

        // Update local storage character info
        if (character.ctype != "merchant") {
            set(localStorageVariables.invStatus, JSON.stringify(character.items))
        }
        else if (this.botStates.restock.stateData.shouldRestock == false) {
            let activeCharacters = getActiveCharacterNames()
            for (let name of activeCharacters) {
                if (character.name == name) continue;
                let inv = get(name + "_inv")
                if (!inv) continue;
                inv = JSON.parse(inv)
                if (findInventoryIndexes(null, inv) < inv.length / 2) {
                    this.botStates.restock.stateData.shouldRestock = true;
                    break
                }
            }
        }

        this.handlerTimeouts.localStorageHandler = setTimeout(() => { this.localStorageHandler(); }, this.config.localStorageHandlerTimeout);
    }

    skillHandler() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Bot.skillHandler()")

        // Character classes (merchant, rogue, ranger, warrior, priest, paladin, mage) will need to overwrite this with their own skillHandler

        this.handlerTimeouts.skillHandler = setTimeout(() => { this.skillHandler(); }, this.config.skillHandlerTimeout);
    }

    stateHandlerIdle() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler")
        // Merchant/Hunter classes should override this as necessary
        let ret = {
            nextState: this.botStates.idle,
            nextUse: this.botStates.idle.defaultTimeout
        }

        // Recover state backup
        if (!this.botStates.idle.stateData.attemptedBackup) {
            let stateBackup = get(localStorageVariables.stateBackup)
            if (stateBackup) {
                stateBackup = JSON.parse(stateBackup)
                for (let state in stateBackup) {
                    let timeSinceUpdate = Date.now() - stateBackup[state].lastUpdate
                    if (timeSinceUpdate < (2 * this.config.localStorageHandlerTimeout)) {
                        this.botStates = stateBackup
                        let configBackup = get(localStorageVariables.configBackup)
                        if (configBackup) this.config = JSON.parse(configBackup)
                        break;

                    }
                }
            }
            this.botStates.idle.stateData.attemptedBackup = true
        }

        maintainParty()

        return ret
    }

    stateHandlerFollow() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler")
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerTransition() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler")
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerEvade() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler")
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerRecover() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler")
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerInvMgmt() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler")
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerUpgrade() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler")
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerCompound() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler")
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerRestock() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler")
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerWander() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler")
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerMonsterHunt() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler")
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerHuntTarget() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler")
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerEvent() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler")
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandler() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Bot.stateHandler()")

        let ret = this.currentState.stateHandler()
        this.currentState.lastUpdate = Date.now()

        this.currentState = ret.nextState

        this.handlerTimeouts.stateHandler = setTimeout(() => { this.stateHandler(); }, ret.nextUse > 50 ? ret.nextUse : 50);
    }
}