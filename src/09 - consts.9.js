const pot_priority = {
    na: 0,
    low: 1,
    medium: 2,
    high: 3
}

const bot_states = {
    idle: {
        last_update: Date.now(),
    },
    event: {
        last_update: Date.now(),
    },
    recover: {
        last_update: Date.now(),
    },
    evade: {
        last_update: Date.now(),
    },
    hunt_target: {
        last_update: Date.now(),
        target_pack: {
            mtype: "",
        }
    },
    inv_mgmt: {
        last_update: Date.now(),
    },
    sales_town: {
        last_update: Date.now(),
        transition_servers: false,
    },
    sales_wander: {
        last_update: Date.now(),
        transition_servers: false,
    },
    event: {
        last_update: Date.now(),
    },
    restock: {
        last_update: Date.now(),
    },
    upgrade: {
        last_update: Date.now(),
    },
    compound: {
        last_update: Date.now(),
    },
    transit: {
        last_update: Date.now(),
    }
}