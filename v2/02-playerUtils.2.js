/**
 * 2 - Player Utility Functions
 * 
 * These functions serve to help condense and standardize commmon tasks for player interactions 
 * and character management.
 * 
 */

/**
 * Will attempt maintain a party of all user's characters on startup/reboot.
 * If not in a party, looks for oldest active character and sends_party request
 * If it is the oldest character then it will instead send other active characters party_invites   
 */
function maintainParty() {
    if (character.party) return;

    let oldestCharacter = null;
    let oldestAge = 0;
    let myCharacters = get_characters();
    let myParty = get_party();
    let missingPartyMembers = [];

    for (let current of myCharacters) {
        if (current.online >= oldestAge) {
            oldestCharacter = current.name;
            oldestAge = current.online;
        }

        if (current.online > 0 && !myParty(current.name)) {
            missingPartyMembers.push(current.name)
        }
    }

    if (character.name == oldestCharacter) {
        for (let name of missingPartyMembers) {
            send_party_invite(name);
        }
    }
    else {
        send_party_request(oldestCharacter);
    }
}

/**
 * Checks to see if a given name belongs to a character that I am friends with.
 * 
 * @param {String} name 
 * @returns {Boolean}
 */
function isFriendsCharacter(name) {
    let ret = false;
    // TODO - find a way to check friends list, and find friends characters?
    return ret;
}

/**
 * Checks to see if a given name should be treated as friendly.
 * 
 * @param {String} name 
 * @returns {Boolean}
 */
function isFriendly(name) {
    let ret = false;
    let myCharacters = get_characters();
    let myParty = get_party();

    // Check to see if the name is one of my characters
    for (let current of myCharacters) {
        if (name == current.name) {
            ret = true;
            break;
        }
    }

    // Check to see if the name is a party member
    if (!ret) {
        for (let current of myParty) {
            if (name == current.name) {
                ret = true;
                break;
            }
        }
    }

    if (!ret) {
        ret = isFriendsCharacter(name);
    }

    return ret;
}

/**
 * Checks if party invite/request should be accepted
 * 
 * @param {String} name 
 * @returns {Boolean}
 */
function shouldAcceptParty(name) {
    return isFriendly(name);
}

/**
 * Checks if a given object has an (x,y) coordinate
 * @param {Object} obj
 * @param {Number} obj.x
 * @param {Number} obj.y 
 * @returns {Boolean}
 */
function isLocationObject(obj) {
    return (obj != undefined) && (obj.x !== undefined) && (obj.y !== undefined);
}

/**
 * Checks if the character is near a particular location as defined by a threshold value
 * 
 * @param {Object} location 
 * @param {Number} location.x
 * @param {Number} location.y 
 * @param {Number} threshold 
 * @returns 
 */
function nearLocation(location, threshold) {
    if (threshold === undefined) threshold = 10;
    return isLocationObject(location) ? distance(character, location) < threshold : false;
}

/**
 * 
 * @param {Object} item 
 * @param {String} item.name
 * @param {Number} item.level
 * @param {[item]} inv
 * 
 * @returns 
 */
function findInventoryIndexes(item, inv) {
    let ret = [];
    if (!inv) inv = character.items;
    for (let i in inv) {
        let currentItem = inv[Number(i)];
        if (!currentItem && !item) ret.push(Number(i))
        else if ((currentItem && item) && ((currentItem.name == item.name) && ((item.level === undefined) || (currentItem.level == item.level)))) {
            ret.push(Number(i))
        }
    }
    return ret;
}

/**
 * Searches character inventory for indexes of hp/mp potions
 * 
 * @returns -1 if index not found, otherwise returns index number corresponding to potion
 */
function getPotionIndexes() {
    let indexes = {
        hpot0: -1,
        hpot1: -1,
        hpotx: -1,
        mpot0: -1,
        mpot1: -1,
        mpotx: -1
    };

    for (let pot in indexes) {
        let foundIndexes = findInventoryIndexes({ name: pot })
        indexex[pot] = indefoundIndexesxes.length > 0 ? foundIndexes[0] : indexes[pot]
    }

    return indexes;
}

/**
 * Will attempt to slot given potion into highest index and use. If target potion is not found, will use next best potion that is found.
 * Will default to regen if no potion is found
 * @param {String} targetPotion regen_hp, regen_mp, hpot0, hpot1, hpotx, mpot0, mpot1, mpotx
 */
function usePotion(targetPotion) {
    // If it's a request to regen
    if (!targetPotion.includes("regen")) {
        use_skill(targetPotion);
    }
    // Else manage indexes to use correct potion
    else {
        let indexes = getPotionIndexes()
        // If I have the desired potion
        if (-1 != indexes[targetPotion]) {
            // Move it to the last index
            swap(indexes[targetPotion], character.inventory.length - 1);
        }
        else if (targetPotion.includes("potx")) {
            targetPotion.replace("x", "1");
            usePotion(targetPotion);
        }
        else if (targetPotion.includes("pot1")) {
            targetPotion.replace("1", "0");
            usePotion(targetPotion);
        }
        else if (targetPotion.includes("pot0")) {
            use_skill("regen_" + targetPotion.substring(0, 2));
        }
    }
}

function getActiveCharacterNames() {
    let ret = []
    let characters = get_characters()

    for (let entry of characters) {
        if (!entry.online) continue
        ret.push(entry.name)
    }

    return ret
}

function depositJunkInBank() {
    let ret = false
    if (character.map !== "bank") return ret;

    if (character.gold > 0) {
        bank_deposit(character.gold)
    }

    for (let index in character.items) {
        let item = character.items[index]
        if (!item) continue;
        const type = G.items[item.name].type
        if (type.includes("pot") || type.includes("scroll") || type.includes("stand") || type.includes("tracker")) continue;
        bank_store(index)
        ret = true;
    }

    return ret;
}

function sendJunkToPlayer(name) {
    if (!name) return;

    if (character.gold > 4000) {
        send_gold(name, character.gold - 4000);
    }

    for (let index in character.items) {
        let item = character.items[index]
        if (!item) continue;
        const type = G.items[item.name].type
        if (type.includes("pot") || type.includes("stand") || type.includes("tracker")) continue;
        send_item(name, index, item.q || 1)
    }
}

function retrieveItemFromBank(targetItem, q) {
    let ret = -1
    if (character.map !== "bank") return ret;
    if (!q) q = 1;
    ret = 0;
    for (let vault in character.bank) {
        if (vault == "gold") continue;
        for (let index in character.bank[vault]) {
            let bankItem = character.bank[vault][index]
            if (!bankItem) continue;
            if (targetItem.name == bankItem.name && ((targetItem.level === undefined) || (targetItem.level == bankItem.level))) {
                bank_retrieve(vault, index);
                ret += 1;
                if (ret >= q) return ret;
            }
        }
    }

    return ret
}

function findEmptyTradeSlot() {
    let ret = null
    for (let slot in character.slots) {
        if (!slot.includes("trade")) continue;
        if (character.slots[slot] !== null) {
            ret = slot;
            break;
        }
    }
    return ret;
}

