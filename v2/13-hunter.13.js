/**
 * 13 - Hunter Class
 * 
 * Extended Hunter Functionality
 * 
 */

load_code(1, () => { game_log("Failed to load code slot 1 from 13"); });
load_code(2, () => { game_log("Failed to load code slot 2 from 13"); });
load_code(3, () => { game_log("Failed to load code slot 3 from 13"); });
load_code(4, () => { game_log("Failed to load code slot 4 from 13"); });
load_code(5, () => { game_log("Failed to load code slot 5 from 13"); });
load_code(6, () => { game_log("Failed to load code slot 6 from 13"); });
load_code(11, () => { game_log("Failed to load code slot 11 from 13"); });

class Hunter extends Bot {
    constructor() {
        this.handlerTimeouts.kiteHandler = null;
        this.handlerTimeouts.attackHandler = null;

        this.config.kiteHandlerTimeout = 300;
        this.config.attackHandlerTimeout = Math.floor((1000 / character.frequency) / 2);

        this.priorityTarget = null
    }

    init() {
        super.init();
        this.logger.dLog(debugLogLevels.controlFlow0, "Hunter.init()");

        this.handlerTimeouts.kiteHandler = setTimeout(() => { this.kiteHandler(); }, this.config.kiteHandlerTimeout);
        this.handlerTimeouts.attackHandler = setTimeout(() => { this.attackHandler(); }, this.config.attackHandlerTimeout);
    }

    determinePriorityTarget() {
        // TODO
        // If there is someone I can/should heal
        if (character.heal > 0) {
            let maxMissing = 0
            for (let entry of this.trackedEntities.partyMembers) {
                let missingHp = entry.max_hp - entry.hp
                if ((missingHp > character.heal) && (missingHp > maxMissing)) {
                    maxMissing = missingHp
                    this.trackedEntities.healTarget = entry
                }
            }
            if (maxMissing > 0) {
                this.trackedEntities.attackTarget = null
                return this.trackedEntities.healTarget
            }

        }
        else {
            this.trackedEntities.healTarget = null
        }

        // Hostile player
        let hostile = null
        for (let entry of this.trackedEntities.hostilePlayers) {
            // TODO - Double check they are indeed hostile?
            if (entry.owner == character.owner) continue

            // TODO - improve target prioritization
            if (hostile == null) {
                if ((entry.targets < 1) || (entry == this.trackedEntities.attackTarget)) {
                    hostile = entry
                }
            }
            else if ((hostile.hp > entry.hp) && (entry.hp > (0.5 * character.attack))) {
                hostile = entry
            }
        }
        if (hostile !== null) {
            this.trackedEntities.attackTarget = hostile
            return hostile
        }

        // Hostile strong monster
        for (let entry of this.trackedEntities.hostileMonsters) {
            // TODO - improve target prioritization
            if (hostile == null) {
                if ((entry.targets < 1) || (entry == this.trackedEntities.attackTarget)) {
                    hostile = entry
                }
            }
            else if ((hostile.hp > entry.hp) && (entry.hp > (0.5 * character.attack))) {
                hostile = entry
            }
        }
        if (hostile !== null) {
            this.trackedEntities.attackTarget = hostile
            return hostile
        }
        // Special Monster
        if (this.trackedEntities.specialMonsters.length > 0) {
            this.trackedEntities.attackTarget = this.trackedEntities.specialMonsters[0]
            return this.trackedEntities.specialMonsters[0]
        }

        // Target Monster
        let minDistance = 9000000
        for (let entry of this.trackedEntities.targetMonsters) {
            // TODO - Prioritize based on reward potential?
            let _entry = {
                x: entry.real_x !== undefined ? entry.real_x : entry.x,
                y: entry.real_y !== undefined ? entry.real_y : entry.y
            }
            let _character = {
                x: character.real_x !== undefined ? character.real_x : character.x,
                y: character.real_y !== undefined ? character.real_y : character.y
            }
            let dx = _character.x - _entry.x
            let dy = _character.y - _entry.y
            let dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < minDistance) {
                hostile = entry
                minDistance = dist
            }
        }

        if (hostile !== null) {
            this.trackedEntities.attackTarget = hostile
            return hostile
        }

        // Weak monster
        minDistance = 9000000
        for (let entry of this.trackedEntities.easyMonsters) {
            if (entry.hp > character.attack) continue;
            let _entry = {
                x: entry.real_x !== undefined ? entry.real_x : entry.x,
                y: entry.real_y !== undefined ? entry.real_y : entry.y
            }
            let _character = {
                x: character.real_x !== undefined ? character.real_x : character.x,
                y: character.real_y !== undefined ? character.real_y : character.y
            }
            let dx = _character.x - _entry.x
            let dy = _character.y - _entry.y
            let dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < minDistance) {
                hostile = entry
                minDistance = dist
            }
        }

        if (hostile !== null) {
            this.trackedEntities.attackTarget = hostile
            return hostile
        }

        return null

    }

    kiteTarget(target) {

    }

    kiteHandler() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Hunter.kiteHandler()");
        let priorityTarget = this.determinePriorityTarget()
        this.kiteTarget(priorityTarget)

        this.handlerTimeouts.kiteHandler = setTimeout(() => { this.kiteHandler(); }, this.config.kiteHandlerTimeout);
    }

    attackHandler() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Hunter.attackHandler()");
        // TODO

        this.handlerTimeouts.attackHandler = setTimeout(() => { this.attackHandler(); }, this.config.attackHandlerTimeout);

    }

    stateHandlerFollow() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler");
        // TODO
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerTransition() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler");
        // TODO
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerEvade() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler");
        // TODO
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerRecover() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler");
        // TODO
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerInvMgmt() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler");
        // TODO
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerUpgrade() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler");
        // TODO
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerCompound() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler");
        // TODO
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerRestock() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler");
        // TODO
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerWander() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler");
        // TODO
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerMonsterHunt() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler");
        // TODO
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerHuntTarget() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler");
        // TODO
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }

    stateHandlerEvent() {
        this.logger.dLog(debugLogLevels.fatal, "Entered Base Bot Handler");
        // TODO
        // Merchant/Hunter classes should override these handlers
        let ret = {
            nextState: this.currentState,
            nextUse: this.currentState.defaultTimeout
        }

        return ret
    }
}