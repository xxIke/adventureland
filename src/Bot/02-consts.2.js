/**
 * 2 - Constants
 * 
 * These values and structures can be referenced by code to ensure consistent values used and 
 * well defined structures are in place
 * 
 */

function constConfirmFile() {
    return true;
}

const botConfig = {
    logLevel: 4,
    logLength: 100,
    server: null,
    hpThreshold: 0.5,
    mpThreshold: 0.5,
}

const localStorageVariables = {
    characterLog: character.name + "_log",
    stateBackup: character.name + "_StateBackup",
    inventoryStatus: character.name + "_inv",
}

const definedLocations = {
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

// Substrings of items that are not junk
const nonJunkItems = [
    "hpot",
    "mpot",
    "stand",
    "tracker",
]

const validSpecialMonsters = [
    "phoenix",
    "mvampire",
]