/**
 * 10 - Bot Class
 * 
 * Base functionality for all bots
 * 
 */

class Bot {
    constructor(config) {
        this.config = {
            logLevel: config.logLevel || logLevels.info,
            logLength: config.logLength || 100,
            server: config.server || null,
            hpThreshold: config.hpThreshold || 0.5,
            mpThreshold: config.mpThreshold || 0.5,
            ...config
        };

        this.log = new Logger(this.config.logLevel, this.config.logLength);
        this.log.info(`Created bot ${character.name}`);

        this.moveManager = new MoveManager();

        this.botStates = {
            initial: {
                stateName: 'initial',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerInitial.bind(this),
                defaultTimeout: 5000,
            },
            rally: {
                stateName: 'rally',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerRally.bind(this),
                defaultTimeout: 5000,
            },
            follow: {
                stateName: 'follow',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerFollow.bind(this),
                defaultTimeout: 5000,
            },
            transition: {
                stateName: 'transition',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerTransition.bind(this),
                defaultTimeout: 5000,
            },
            evade: {
                stateName: 'evade',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerEvade.bind(this),
                defaultTimeout: 5000,
            },
            recover: {
                stateName: 'recover',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerRecover.bind(this),
                defaultTimeout: 5000,
            },
        }

        this.currentState = this.botStates.initial;

        this.timeouts = new Map();

        // Entity information of note
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

        this.botInfo = {
            startTime: new Date().toISOString(),
            xpEarned: 0,
            goldEarned: 0,
        }

    }

    init() {
        this.log.info(`Bot ${character.name} is initializing`);

        ret = this.ensureFileAccess();
        if (!ret) {
            this.log.error(`Bot ${character.name} failed to initialize -- missing file access`);
            return false;
        }

        this.timeouts.set('potionHandler', setTimeout(this.potionHandler.bind(this), 50));
        this.timeouts.set('entityHandler', setTimeout(this.entityHandler.bind(this), 60));
        this.timeouts.set('skillHandler', setTimeout(this.skillHandler.bind(this), 70));
        this.timeouts.set('logHandler', setTimeout(this.logHandler.bind(this), 80));
        this.timeouts.set('stateHandler', setTimeout(this.stateHandler.bind(this), 90));
    }

    ensureFileAccess() {
        return constConfirmFile() &&
            characterUtilsConfirmFile() &&
            monsterUtilsConfirmFile() &&
            serverCoordinationConfirmFile() &&
            this.log.loggerConfirmClass() &&
            this.moveManager.moveMangerConfirmClass();
    }

    start() {
        this.log.info(`Bot ${character.name} is starting`);

        if (!this.init()) {
            this.log.error(`Bot ${character.name} failed to start`);
        }
        else {
            this.log.info(`Bot ${character.name} started successfully`);
        }
    }

    stop() {
        this.log.info(`Bot ${character.name} is stopping`);
    }

    softStop() {
        this.log.info(`Bot ${character.name} is soft stopping`);
    }

    /**
     * Determines which potion to use based on the current state of the bot.
     * Will use regen where possible. 
     */
    potionHandler() {
        this.log.info(`Bot ${character.name} is checking potions`);
        let nextUse = 500;

        this.timeouts.set('potionHandler', setTimeout(this.potionHandler.bind(this), nextUse));
    }

    /**
     * Checks for entities of note, such as party members, hostile players, and special monsters.
     * Updates trackedEntities lists with any entities of note.
     */
    surveyEntities() {
        this.log.info(`Bot ${character.name} is surveying entities`);
        let specialMonsters = [];
        let targetMonsters = [];
        let easyMonsters = [];
        let hostileMonsters = [];
        let hostilePlayers = [];
        let partyMembers = [];
        let playersOfferingTrade = [];

        partyMembers.push(character);

        for (let id in parent.entities) {
            let current = parent.entities[id];
            if ((!current.visible) || current.dead || current.rip || (current.type == "npc")) continue;

            // Handle other characters
            if (current.type == "character") {
                // Friendly players
                if (isFriendly(current)) {
                    if (current.party == character.party) {
                        partyMembers.push(current);
                    }
                }
                else if (current.target && this.trackedEntities.partyMembers.some(member => member.name == current.target)) {
                    // Hostile players
                    hostilePlayers.push(current);
                }

                // Have merchant look for trade deals
                if (character.ctype == "merchant") {
                    for (let slot in current.slots) {
                        if (!current.slots[slot] || !slot.includes("trade")) continue;
                        playersOfferingTrade.push(current);
                        break;
                    }
                }

            }
            // Handle monsters
            else if (current.type == "monster") {
                if (current.xp < 0) continue;
                if (current.target && this.trackedEntities.partyMembers.some(member => member.name == current.target)) {
                    hostileMonsters.push(current);
                }
                if (validSpecialMonsters.some(monster => current.name.includes(monster) || current.mtype.includes(monster))) {
                    specialMonsters.push(current);
                }

                let stateTargetType = null;
                if (this.currentState.stateData.type) stateTargetType = this.currentState.stateData.type;
                else if (this.currentState.stateData.mtype) stateTargetType = this.currentState.stateData.mtype;
                if (stateTargetType !== null && stateTargetType == current.mtype) {
                    targetMonsters.push(current);
                }

                if (current.hp < character.attack * 0.8) {
                    easyMonsters.push(current);
                }
            }
            else {
                this.log.error(`Bot ${character.name} encountered unknown entity type: ${current.type}`);
            }
        }

        this.trackedEntities.specialMonsters = [...specialMonsters]
        this.trackedEntities.targetMonsters = [...targetMonsters]
        this.trackedEntities.hostileMonsters = [...hostileMonsters]
        this.trackedEntities.easyMonsters = [...easyMonsters]
        this.trackedEntities.hostilePlayers = [...hostilePlayers]
        this.trackedEntities.partyMembers = [...partyMembers]
        this.trackedEntities.playersOfferingTrade = [...playersOfferingTrade]
    }

    updateTarget() {
        if (character.heal > 0) {
            let maxMissing = 0;
            for (let current of this.trackedEntities.partyMembers) {
                let missingHp = current.max_hp - current.hp;
                if (missingHp > maxMissing) {
                    maxMissing = missingHp;
                    this.trackedEntities.healTarget = current;
                }
            }
        }

        // TODO: Smart target selection
        if (this.trackedEntities.hostilePlayers.length > 0) {
            this.trackedEntities.attackTarget = this.trackedEntities.hostilePlayers[0];
        }
        else if (this.trackedEntities.hostileMonsters.length > 0) {
            this.trackedEntities.attackTarget = this.trackedEntities.hostileMonsters[0];
        }
        else if (this.trackedEntities.specialMonsters.length > 0) {
            this.trackedEntities.attackTarget = this.trackedEntities.specialMonsters[0];
        }
        else if (this.trackedEntities.targetMonsters.length > 0) {
            this.trackedEntities.attackTarget = this.trackedEntities.targetMonsters[0];
        }
        else if (this.trackedEntities.easyMonsters.length > 0) {
            this.trackedEntities.attackTarget = this.trackedEntities.easyMonsters[0];
        }
        else {
            this.trackedEntities.attackTarget = null;
        }
    }

    /**
     * Updates trackedEntities with any entities of note.
     */
    entityHandler() {
        this.log.info(`Bot ${character.name} is surveying entities`);
        let nextUse = 250;
        maintainParty();
        this.surveyEntities();
        this.updateTarget();

        this.timeouts.set('entityHandler', setTimeout(this.entityHandler.bind(this), nextUse));
    }

    /**
     * Backs up bot log and state.
     * Uses server if available, else uses local storage.
     * Will verify that bot is aligned with party objectives
     */
    logHandler() {
        this.log.info(`Bot ${character.name} is handling logs`);
        let nextUse = 5000;

        this.timeouts.set('logHandler', setTimeout(this.logHandler.bind(this), nextUse));
    }

    /**
     * Uses skills as appropriate, child classes should extend this function
     * to handle specific skills.
     */
    skillHandler() {
        this.log.info(`Bot ${character.name} is handling skills`);
        let nextUse = 1000;

        this.timeouts.set('skillHandler', setTimeout(this.skillHandler.bind(this), nextUse));
    }

    /**
     * Call appropriate state handler based on current state.
     */
    stateHandler() {
        this.log.info(`Bot ${character.name} is handling states`);
        this.currentState.lastUpdate = new Date().toISOString();
        let nextUse = this.currentState.stateHandler();

        this.timeouts.set('stateHandler', setTimeout(this.stateHandler.bind(this), nextUse));
    }

    /**
     * Handles the initial load state of the bot.
     * Will join with the other characters, appropriately register with server/party, and
     * get party objectives.
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerInitial() {
        this.log.info(`Bot ${character.name} is handling initial state`);
        let nextUse = 1000;

        return nextUse;
    }

    /**
     * Rallies with party at a given location.
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerRally() {
        this.log.info(`Bot ${character.name} is handling rally state`);
        let nextUse = 1000;

        return nextUse;
    }

    /**
     * Follow and support a specific character.
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerFollow() {
        this.log.info(`Bot ${character.name} is handling follow state`);
        let nextUse = 1000;

        return nextUse;
    }

    /**
     * Handle any complex state transitions.
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerTransition() {
        this.log.info(`Bot ${character.name} is handling transition state`);
        let nextUse = 1000;

        return nextUse;
    }

    /**
     * Evade danger and slowly recover.
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerEvade() {
        this.log.info(`Bot ${character.name} is handling evade state`);
        let nextUse = 1000;

        return nextUse;
    }

    /**
     * Stay passive and regen hp/mp.
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerRecover() {
        this.log.info(`Bot ${character.name} is handling recover state`);
        let nextUse = 1000;

        return nextUse;
    }
}