// Utility functions
// These should all be standalone and not require other file dependencies

/** TODO - low - NA
 * Checks to see if character name is likely to be a friend
 * 
 * @param {string} name 
 * 
 * @returns {Boolean} if this is likely to be a friend
 */
function is_friends_character(name) {
    let ret = false;
    // Need to check a friend's list

    return ret
}

/**
 * Checks to see if a given name should be treated as friendly
 * 
 * @param {string} name 
 * 
 * @returns {Boolean} if this is likely to be a friend
 */
function is_friendly(name) {
    let ret = false;
    let my_characters = get_characters();

    for (let character_sheet of my_characters) {
        if (name == character_sheet.name) {
            ret = true;
        }
    }

    if (!ret) {
        ret = is_friends_character(name);
    }

    return ret;
}

/**
 * 
 * @param {string} name 
 * @returns {Boolean}
 */
function should_accept_party(name) {
    return is_friendly(name);
}

/**
 * Attempt to be able to perform clones of objects in game without cycling through character
 * 
 * @param {*} obj 
 * @returns 
 */
function clone_object(obj) {
    let ret = undefined
    if (!obj || obj == true) return obj
    // if (obj.visible !== undefined) {
    //     ret = {}
    //     for (attribute in entity_ref) {
    //         ret[attribute] = clone_object(obj[attribute])
    //     }
    // }
    // Attempt to prevent dumbness having me copy an entity 
    if ((obj.visible !== undefined) || (obj.mtype !== undefined) || (obj.ctype !== undefined)) {
        ret = { ...obj }
    }
    else {
        ret = JSON.parse(JSON.stringify(obj))
    }
    return ret
}

/**
 * Checks if given loc has x,y coordinates
 * @param {object} loc 
 * @param {number} loc.x 
 * @param {number} loc.y 
 * @returns {boolean}
 */
function is_loc_object(loc) {
    return (loc != undefined) && (loc.x != undefined) && (loc.y != undefined);
}

/**
 * Checks if near a given target
 * @param {object} target 
 * @param {number} target.x 
 * @param {number} target.y 
 * @returns {boolean}
 */
function near_target(target, max_d) {
    if (!max_d) max_d = 10
    return is_loc_object(target) ? distance(character, target) < max_d : false;
}

function get_party_names_arr() {
    let party = get_party()
    let ret = []
    for (let member in party) {
        ret.push(member)
    }
    return ret
}

function get_character_names_arr() {
    let characters = get_characters();
    let ret = []
    for (let member of characters) {
        ret.push(member.name)
    }
    return ret
}

function get_active_characters_name_arr() {
    let characters = get_characters();
    let active_characters = [];
    for (let member of characters) {
        if (member.online > 0) {
            active_characters.push(member.name);
        }
    }
    return active_characters;
}

function is_party_assembled() {
    let ret = true;
    let party = get_party()

    for (let name in party) {
        if (!get_player(name)) {
            ret = false;
            break;
        }
    }

    return ret;
}

function are_hunters_assembled() {
    let ret = true;
    let party = get_party()

    for (let name in party) {
        if (party[name].type == "merchant") continue;
        if (!get_player(name)) {
            ret = false;
            break;
        }
    }

    return ret;
}

/**
 * 
 * @param {object} item 
 * @param {string} item.name
 * @param {number} item.level
 * 
 * @returns [] array of indexes for given item
 */
function find_indexes_in_inv(item, inv) {
    let ret = []
    if (!inv) inv = character.items
    for (let i in inv) {
        let citem = inv[i]
        if (!citem && !item) { ret.push(Number(i)) }
        // else if ((citem && item) && ((citem.name == item.name) && (!item.q || (citem.q == item.q)) && (!item.level || (citem.level == item.level)))) {
        else if ((citem && item) && ((citem.name == item.name) && (!item.level || (citem.level == item.level)))) {
            ret.push(Number(i))
        }
        else { continue; }
    }
    return ret;
}

function fulfill_player_wishlist(player) {
    for (let slot in player.slots) {
        if (!slot.includes("trade")) continue
        let item = player.slots[slot]
        // find listed buy requests that I can fulfill
        if (!item || !item.b || find_indexes_in_inv(item).length < 1) continue
        // Sell cheap to me, or sell at market value to others
        let price_threshold = is_friendly(player.name) ? item_value(item) * 0.8 : item_value(item) * 1.2
        if ((player.owner == character.owner) || (price_threshold <= item.price)) {
            trade_sell(player, slot, player.slots[slot].q)
        }
    }
}