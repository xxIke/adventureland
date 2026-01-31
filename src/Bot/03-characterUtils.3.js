/**
 * 3 - Character Utility Functions
 * 
 * These functions serve to help condense and standardize cmmmon tasks for character interactions
 * 
 */

/**
 * Test function in file to ensure file was loaded correctly
 * @returns {Boolean} - True if the file is valid
 */
function characterUtilsConfirmFile() {
    return true;
}

/**
 * Ensures characters are in a party with each other.
 * Merchant will send party invites to any missing characters
 * Other characters will send party requests to the merchant
 */
function maintainParty() {
    if (character.ctype == "merchant") {
        allCharacters = get_characters();
        onlineCharacters = allCharacters.filter(c => c.online > 0);
        partyCharacters = get_party();
        missingPartyMembers = [];
        for (let current of onlineCharacters) {
            if (current.name != character.name && !partyCharacters[current.name]) {
                missingPartyMembers.push(current.name);
            }
        }
        for (let name of missingPartyMembers) {
            send_party_invite(name);
        }
    }
    else {
        allCharacters = get_characters();
        merchantCharacter = allCharacters.filter(c => (c.ctype == "merchant" && c.online > 0));
        partyCharacters = get_party();
        if (merchantCharacter.length > 0 && !partyCharacters[merchantCharacter[0].name]) {
            send_party_request(merchantCharacter[0].name);
        }
    }
}

/**
 * Checks to see if a given name is one of my characters, a character in my party, or a character of a friend.
 * @param {Object} otherCharacter - The character to check against
 * @param {String} otherCharacter.name - The name of the character to check
 * @param {String} otherCharacter.owner - The owner of the character to check
 * @returns {Boolean} - True if the character is friendly, false otherwise
 */
function isFriendly(otherCharacter) {
    let ret = false;
    let partyCharacterNames = Object.keys(get_party())
    let friends = character.friends;

    if (otherCharacter.owner == character.owner) {
        ret = true;
    }
    else if (partyCharacterNames.includes(otherCharacter.name)) {
        ret = true;
    }
    else if (friends.includes(otherCharacter.owner)) {
        ret = true;
    }

    return ret;
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
    if (!isLocationObject(location)) return false;
    if (location.map && (location.map !== character.map)) return false;
    if (threshold === undefined) threshold = 10;
    return distance(character, location) < threshold;
}

/**
 * Finds the indexes of a specified item in an inventory
 * 
 * @param {Object} item 
 * @param {String} item.name
 * @param {Number} item.level
 * @param {[item]} inv
 * 
 * @returns {Array} - An array of indexes where the item is found in the inventory 
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
 * @returns {Object} - An object containing the index for each potion type, -1 if not found
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
        indexes[pot] = foundIndexes.length > 0 ? foundIndexes[0] : indexes[pot]
    }

    return indexes;
}

/**
 * Uses target potion if available, otherwise uses next lower tier potion, defaulting to regen if no potions are available
 * @param {String} potion - The name of the potion to use
 * @returns {Boolean} - True if the potion was used successfully, false otherwise
 */
function usePotion(potion) {
    if (potion.includes("regen")) {
        use_skill(potion);
        return true;
    }

    let indexes = getPotionIndexes();
    let potionIndex = indexes[potion];
    if (potionIndex != -1) {
        swap(potionIndex, character.items.length - 1);
        use_skill("use_" + potion.substring(0, 2));
        return true;
    }
    else if (potion.includes("potx")) {
        potion.replace("x", "1");
        usePotion(potion);
    }
    else if (potion.includes("pot1")) {
        potion.replace("1", "0");
        usePotion(potion);
    }
    else if (potion.includes("pot0")) {
        use_skill("regen_" + potion.substring(0, 2));
    }

    return false;
}

/**
 * Deposits junk items into the bank, requires character to be in the bank
 * @returns {Boolean} - True if the character is in the bank and successfully deposited items, false otherwise
 */
function depositJunkInBank() {
    let ret = false;
    if (character.map !== "bank") return ret;

    if (character.gold > 0) {
        bank_deposit(character.gold);
    }

    for (let index in character.items) {
        let item = character.items[index];
        if (!item) continue;
        if (nonJunkItems.some(substring => item.name.includes(substring))) continue;
        bank_store(index);
        ret = true;
    }

    return ret;
}

/**
 * Sends junk items to a player, requires target character to be near.
 * @param {String} name 
 * @returns 
 */
function sendJunkToPlayer(name) {
    let ret = false;
    if (!name) return ret;
    if (!get_entity(name)) return ret;

    if (character.gold > 4000) {
        send_gold(name, character.gold - 4000);
    }

    for (let index in character.items) {
        let item = character.items[index];
        if (!item) continue;
        if (nonJunkItems.some(substring => item.name.includes(substring))) continue;
        send_item(name, index, item.q || 1);
        ret = true;
    }

    return ret;
}

/**
 * Retrieves a specified item from the bank, requires character to be in the bank
 * 
 * @param {Object} item
 * @param {String} item.name
 * @param {Number} item.level
 * @param {Number} item.q
 * @param {Number} quantity
 * @returns 
 */
function retrieveItemFromBank(item, quantity = 1) {
    let ret = -1;
    if (character.map !== "bank" || !item) return ret;
    ret = 0;

    for (let vault in character.bank) {
        if (vault == "gold") continue;
        for (let index in character.bank[vault]) {
            let currentItem = character.bank[vault][index];
            if (!currentItem) continue;
            if ((currentItem.name == item.name) && ((item.level === undefined) || (currentItem.level == item.level))) {
                bank_retrieve(vault, index);
                ret += currentItem.q || 1;
                if (ret >= quantity) break;
            }
        }
    }

    return ret;
}

/**
 * Finds the first empty trade slot available
 * @returns {String} - The first empty trade slot available
 */
function findEmptyTradeSlot() {
    let ret = null
    for (let slot in character.slots) {
        if (!slot.includes("trade")) continue;
        if (character.slots[slot] === null) {
            ret = slot;
            break;
        }
    }
    return ret;
}
