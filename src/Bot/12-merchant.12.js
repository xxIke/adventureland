/**
 * 12 - Merchant Class
 * 
 * Extended Bot for Merchant Functionality
 * 
 */

class Merchant extends Bot {
    constructor(config) {
        super(config);
        this.log.info(`Merchant ${character.name} created`);

        this.merchantStates = {
            inv_mgmt: {
                stateName: 'inv_mgmt',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerInvMgmt.bind(this),
                defaultTimeout: 5000,
            },
            upgrade: {
                stateName: 'upgrade',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerUpgrade.bind(this),
                defaultTimeout: 5000,
            },
            compound: {
                stateName: 'compound',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerCompound.bind(this),
                defaultTimeout: 5000,
            },
            restock: {
                stateName: 'restock',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerRestock.bind(this),
                defaultTimeout: 5000,
            },
            trade: {
                stateName: 'trade',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerTrade.bind(this),
                defaultTimeout: 5000,
            },
            nodes: {
                stateName: 'nodes',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerNodes.bind(this),
                defaultTimeout: 5000,
            },
            scout: {
                stateName: 'scout',
                stateData: {},
                lastUpdate: undefined,
                stateHandler: this.stateHandlerScout.bind(this),
                defaultTimeout: 5000,
            },
        }

        this.botStates = {
            ...this.botStates,
            ...this.merchantStates,
        }

    }

    init() {
        super.init();
        this.log.info(`Merchant ${character.name} initialized`);

        this.timeouts.set('hunterHandler', setTimeout(this.hunterHandler.bind(this), 1000));
        this.timeouts.set('tradeHandler', setTimeout(this.tradeHandler.bind(this), 1000));
    }

    hunterHandler() {
        // Handle hunter-specific methods here
        this.log.info(`${character.name} Determing hunter state`);
        let nextUse = 1000;
        // Implement logic for hunter-specific tasks

        this.timeouts.set('hunterHandler', setTimeout(this.hunterHandler.bind(this), nextUse));
    }

    tradeHandler() {
        // Handle trade-specific methods here
        this.log.info(`${character.name} Looking for trade deals`);
        let nextUse = 1000;
        // Implement logic for trade-specific tasks

        this.timeouts.set('tradeHandler', setTimeout(this.tradeHandler.bind(this), nextUse));
    }

    skillHandler() {
        // Handle skills for merchant
        this.log.info(`Merchant ${character.name} is handling skills`);
        let nextUse = 1000;
        // Implement logic for using skills

        this.timeouts.set('skillHandler', setTimeout(this.skillHandler.bind(this), nextUse));
    }

    // Add merchant-specific methods here

    /**
     * Creates a up-to-date catalog of items in bank and character inventory
     * Determines improvement/farming goals
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerInvMgmt() {
        // Handle inventory management
        this.log.info(`Handling inventory management for ${character.name}`);
        let nextUse = 1000;
        // Implement logic for inventory management

        return nextUse;
    }

    /**
     * Uses item catalog to upgrade items
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerUpgrade() {
        // Handle item upgrades
        this.log.info(`Handling item upgrade for ${character.name}`);
        // Implement logic for item upgrades
        let nextUse = 1000;

        return nextUse;
    }

    /**
     * Uses item catalog to compound items
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerCompound() {
        // Handle item compounding
        this.log.info(`Handling item compounding for ${character.name}`);
        // Implement logic for item compounding
        let nextUse = 1000;

        return nextUse;
    }

    /**
     * Gathers improved items and potions for hunters
     * Travels to hunter locations to resupply hunters and take their loot
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerRestock() {
        // Handle restocking items
        this.log.info(`Handling restock for ${character.name}`);
        // Implement logic for restocking items
        let nextUse = 1000;

        return nextUse;
    }

    /**
     * Wanders map/server looking for trade deals
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerTrade() {
        // Handle trading with other players
        this.log.info(`Handling trade for ${character.name}`);
        // Implement logic for trading
        let nextUse = 1000;

        return nextUse;
    }

    /**
     * Wanders map/server looking for mining/fishing nodes
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerNodes() {
        // Handle node management
        this.log.info(`Handling nodes for ${character.name}`);
        // Implement logic for node management
        let nextUse = 1000;

        return nextUse;
    }

    /**
     * Wanders map/server exporting information about resources
     * to the external server
     * @returns {Number} nextUse - The next time to call stateHandler
     */
    stateHandlerScout() {
        // Handle scouting for resources
        this.log.info(`Handling scout for ${character.name}`);
        // Implement logic for scouting
        let nextUse = 1000;

        return nextUse;
    }
}