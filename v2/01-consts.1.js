/**
 * 1 - Constants
 * 
 * These values and structures can be referenced by code to ensure consistent values used and 
 * well defined structures are in place
 * 
 */

// Potion Priority levels
const potPriority = {
    na: 0, // No potion needed
    low: 1, // Could use a potion/regen
    medium: 2, // Should use a potion/regen
    high: 3 // Must use a potion
}

const potions = {
    hpotx: "hpotx",
    hpot1: "hpot1",
    hpot0: "hpot0",
    mpotx: "mpotx",
    mpot1: "mpot1",
    mpot0: "mpot0",
    regenHp: "regen_hp",
    regenMp: "regen_mp"
}

const validSpecialMonsters = ["phoenix", "mvampire"];

const localStorageVariables = {
    debugLog: character.name + "_DebugLog",
    infoLog: character.name + "_InfoLog",
    criticalLog: character.name + "_CriticalLog",
    stateBackup: character.name + "_StateBackup",
    configBackup: character.name + "_ConfigBackup",
    invStatus: character.name + "_inv",
    huntTarget: "huntTarget",
    huntCommander: "huntCommander",
    monsterHuntTarget: "monsterHuntTarget",
    huntPartyStatus: "huntPartyStatus",
}

const moveLocations = {
    bank: {
        x: 0,
        y: -70,
        map: "bank"
    },
    upgradeLocation: {
        x: -288,
        y: -103,
        map: "main"
    }
}

const botStates = {
    // Universal States
    idle: {
        state_name: "idle",
        state_data: {},
        last_update: Date.now(),
    },
    follow: {
        state_name: "follow",
        state_data: {},
        last_update: Date.now(),
    },
    transition: {
        state_name: "transition",
        state_data: {},
        last_update: Date.now(),
    },
    evade: {
        state_name: "evade",
        state_data: {},
        last_update: Date.now(),
    },
    recover: {
        state_name: "recover",
        state_data: {},
        last_update: Date.now(),
    },
    // Merchant States
    invMgmt: {
        state_name: "invMgmt",
        state_data: {},
        last_update: Date.now(),
    },
    upgrade: {
        state_name: "upgrade",
        state_data: {},
        last_update: Date.now(),
    },
    compound: {
        state_name: "compound",
        state_data: {},
        last_update: Date.now(),
    },
    restock: {
        state_name: "restock",
        state_data: {},
        last_update: Date.now(),
    },
    wander: {
        state_name: "wander",
        state_data: {},
        last_update: Date.now(),
    },
    // Hunter States
    monsterHunt: {
        state_name: "monsterHunt",
        state_data: {},
        last_update: Date.now(),
    },
    huntTarget: {
        state_name: "huntTarget",
        state_data: {},
        last_update: Date.now(),
    },
    event: {
        state_name: "event",
        state_data: {},
        last_update: Date.now(),
    },
}