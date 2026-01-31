/**
 * 11 - Hunter Class
 * 
 * Extended Bot for Hunter Functionality
 * 
 */

class Hunter extends Bot {
    constructor(config) {
        super(config);
        this.log.info(`Hunter ${character.name} created`);
        this.hunterStates = {
            event: {
                stateName: 'event',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerEvent.bind(this),
                defaultTimeout: 5000,
            },
            monsterHunt: {
                stateName: 'monster_hunt',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerMonsterHunt.bind(this),
                defaultTimeout: 5000,
            },
            huntTargetPack: {
                stateName: 'hunt_target_pack',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerHuntTargetPack.bind(this),
                defaultTimeout: 5000,
            },
        }

        this.botStates = {
            ...this.botStates,
            ...this.hunterStates,
        }
    }

    init() {
        super.init();
        this.log.info(`Hunter ${character.name} is initializing`);

        this.timeouts.set('kiteHandler', setTimeout(this.kiteHandler.bind(this), 500));
        this.timeouts.set('attackHandler', setTimeout(this.attackHandler.bind(this), 500));
    }

    /**
     * Ensure appropriate distance from target is maintained
     */
    kiteHandler() {
        this.log.info(`Hunter ${character.name} is kiting`);
        let nextUse = 250;
        // Implement kite logic here

        this.timeouts.set('kiteHandler', setTimeout(this.kiteHandler.bind(this), nextUse));
    }

    /**
     * Heal/Attack priority target
     */
    attackHandler() {
        this.log.info(`Hunter ${character.name} is attacking`);
        let nextUse = 500;
        // Implement attack logic here

        this.timeouts.set('attackHandler', setTimeout(this.attackHandler.bind(this), nextUse));
    }

    /**
     * Call corresponding event handler logic to participate in server event
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerEvent() {
        this.log.info(`Hunter ${character.name} is handling event state`);
        let nextUse = this.hunterStates.event.defaultTimeout;
        // Implement event state logic here

        return nextUse;
    }

    /**
     * Get monster hunt quest from NPC and see if party strength can handle any of the available quests
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerMonsterHunt() {
        this.log.info(`Hunter ${character.name} is handling monster hunt state`);
        let nextUse = this.hunterStates.monsterHunt.defaultTimeout;
        // Implement monster hunt state logic here

        return nextUse;
    }

    /**
     * Handles hunting within a target pack
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerHuntTargetPack() {
        this.log.info(`Hunter ${character.name} is handling hunt target pack state`);
        let nextUse = this.hunterStates.huntTargetPack.defaultTimeout;
        // Implement hunt target pack state logic here

        return nextUse;
    }
}