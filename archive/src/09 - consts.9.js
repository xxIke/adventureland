const pot_priority = {
    na: 0,
    low: 1,
    medium: 2,
    high: 3
}

const bot_states = {
    idle: {
        state_name: "idle",
        state_data: {},
        last_update: Date.now(),
    },
    recover: {
        state_name: "recover",
        state_data: {},
        last_update: Date.now(),
    },
    evade: {
        state_name: "evade",
        state_data: {},
        last_update: Date.now(),
    },
    transit: {
        state_name: "transit",
        state_data: {},
        last_update: Date.now(),
    },
    hunt_target: {
        state_name: "hunt_target",
        state_data: {
            boundary: [
                -282,
                702,
                218,
                872,
            ],
            count: 9,
            grow: true,
            type: "goo",
        }, // G.maps.main.monsters[14]
        last_update: Date.now(),
    },
    event: {
        state_name: "event",
        state_data: {},
        last_update: Date.now(),
    },
    inv_mgmt: {
        state_name: "inv_mgmt",
        state_data: {},
        last_update: Date.now(),
    },
    compound: {
        state_name: "compound",
        state_data: {},
        last_update: Date.now(),
    },
    upgrade: {
        state_name: "upgrade",
        state_data: {},
        last_update: Date.now(),
    },
    restock: {
        state_name: "restock",
        state_data: {},
        last_update: Date.now(),
    },
    sales: {
        state_name: "sales_town",
        state_data: {
            wander_packs: false,
            transition_servers: false,
        },
        last_update: Date.now(),

    },
    mine: {
        state_name: "mine",
        state_data: {
            transition_servers: false,
        },
        last_update: Date.now(),
    },
    fish: {
        state_name: "fish",
        state_data: {
            transition_servers: false,
        },
        last_update: Date.now(),
    },
}