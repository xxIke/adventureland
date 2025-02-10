/**
 * 13 - Hunter Class
 * 
 * Extended Hunter Functionality
 * 
 */
load_code(11, () => { game_log("Failed to load code slot 11 from 13"); });

class Hunter extends Bot {
    constructor() {
        super()
        this.handlerTimeouts.kiteHandler = null;
        this.handlerTimeouts.attackHandler = null;

        this.config.kiteHandlerTimeout = 300;
        this.config.attackHandlerTimeout = Math.floor((1000 / character.frequency) / 2);

        this.priorityTarget = null

        this.botStates.huntTarget.stateData = { ...G.maps.main.monsters[14] };
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
        if (this.trackedEntities.attackTarget && this.trackedEntities.hostilePlayers.some(member => member.name == this.trackedEntities.attackTarget.name)) {
            return this.trackedEntities.attackTarget;
        }
        for (let entry of this.trackedEntities.hostilePlayers) {
            // TODO - Double check they are indeed hostile?
            if (entry.owner == character.owner) continue
            // TODO - improve target prioritization
            if (hostile == null) {
                if ((entry.targets < 1) || (entry == this.trackedEntities.attackTarget) || (entry.target == character.name)) {
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
        if (this.trackedEntities.attackTarget && this.trackedEntities.hostileMonsters.some(member => member.id == this.trackedEntities.attackTarget.id)) {
            return this.trackedEntities.attackTarget;
        }
        for (let entry of this.trackedEntities.hostileMonsters) {
            // TODO - improve target prioritization
            if (hostile == null) {
                if ((entry.targets < 1) || (entry == this.trackedEntities.attackTarget) || (entry.target == character.name)) {
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
        if (this.trackedEntities.attackTarget && this.trackedEntities.specialMonsters.some(member => member.id == this.trackedEntities.attackTarget.id)) {
            return this.trackedEntities.attackTarget;
        }
        if (this.trackedEntities.specialMonsters.length > 0) {
            this.trackedEntities.attackTarget = this.trackedEntities.specialMonsters[0]
            return this.trackedEntities.specialMonsters[0]
        }

        // Target Monster
        if (this.trackedEntities.attackTarget && this.trackedEntities.targetMonsters.some(member => member.id == this.trackedEntities.attackTarget.id)) {
            return this.trackedEntities.attackTarget;
        }
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
        if (this.trackedEntities.attackTarget && this.trackedEntities.easyMonsters.some(member => member.id == this.trackedEntities.attackTarget.id)) {
            return this.trackedEntities.attackTarget;
        }
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
        if (!target) {
            this.logger.dLog(debugLogLevels.controlFlow0, "Kite requested with no target")
            return;
        }
        // Get target coordinates (going dest if moving)
        const target_x = target.moving ? target.going_x : target.real_x !== undefined ? target.real_x : target.x
        const target_y = target.moving ? target.going_y : target.real_y !== undefined ? target.real_y : target.y
        // Determine how far away I'd like to be
        const desiredDistance = Math.ceil(character.range * 0.9);
        // Determine how far I can move before attempting to move again
        let moveDistance = character.speed * (this.config.kiteHandlerTimeout / 1000);
        // Get current distance
        const dx = target_x - character.real_x;
        const dy = target_y - character.real_y;
        const currentDistance = Math.sqrt((dx * dx) + (dy * dy));
        // Determine how far I should move
        moveDistance = Math.min(moveDistance, currentDistance - desiredDistance)
        // Determine new x,y based on move
        const dx_normal = dx / currentDistance;
        const dy_normal = dy / currentDistance;

        let new_x = character.real_x + dx_normal * moveDistance;
        let new_y = character.real_y + dy_normal * moveDistance;

        // TODO - need to select my point along the desired distance circle so that I kite enemy
        // Rather than just picking closes point on desired distance circle to advance/retreat as appropriate

        this.moveManager.move({ x: new_x, y: new_y }, this.config.kiteHandlerTimeout);
    }

    kiteHandler() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Hunter.kiteHandler()");
        this.kiteTarget(this.trackedEntities.healTarget ? this.trackedEntities.healTarget : this.trackedEntities.attackTarget)
        this.handlerTimeouts.kiteHandler = setTimeout(() => { this.kiteHandler(); }, this.config.kiteHandlerTimeout);
    }

    entityHandler() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Hunter.entitiyHandler()");
        super.entityHandler()
        this.determinePriorityTarget()
    }

    attackHandler() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Hunter.attackHandler()");
        // TODO
        for (let chest in get_chests()) {
            loot();
        }

        const target = this.trackedEntities.healTarget ? this.trackedEntities.healTarget : this.trackedEntities.attackTarget
        let nextUse = this.config.attackHandlerTimeout
        if (target && !can_attack(target)) {
            nextUse = 100;
        }
        else if (target) {
            if (this.trackedEntities.healTarget) {
                heal(target)
            }
            else {
                attack(target)
            }
        }
        else {
            nextUse = 500;
        }

        this.handlerTimeouts.attackHandler = setTimeout(() => { this.attackHandler(); }, this.config.attackHandlerTimeout);

    }

    stateHandlerIdle() {
        this.logger.dLog(debugLogLevels.controlFlow0, "Entered Hunter Idle Handler");

        let ret = {
            nextState: this.botStates.huntTarget,
            nextUse: 50
        }

        super.stateHandlerIdle()

        return ret

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