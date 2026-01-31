/**
 * 1 - Main
 * 
 * Bots should call this to appropriately load and initialize functionality
 * 
 */

function report_load_fail(target_slot, current_file) {
    load_code(target_slot, () => {
        game_log("Failed to load code slot " + target_slot + " from " + current_file);
    });
}

report_load_fail(2, "0-main.0.js");
report_load_fail(3, "0-main.0.js");
report_load_fail(4, "0-main.0.js");
report_load_fail(5, "0-main.0.js");
report_load_fail(6, "0-main.0.js");
report_load_fail(7, "0-main.0.js");
report_load_fail(10, "0-main.0.js");

var bot = null

switch (character.ctype) {
    case "merchant":
        report_load_fail(12, "0-main.0.js");
        bot = new Merchant();
        break;
    case "mage":
        report_load_fail(11, "0-main.0.js");
        report_load_fail(13, "0-main.0.js");
        bot = new Mage();
        break;
    case "rogue":
        report_load_fail(11, "0-main.0.js");
        report_load_fail(13, "0-main.0.js");
        bot = new Rogue();
        break;
    case "ranger":
        report_load_fail(11, "0-main.0.js");
        report_load_fail(13, "0-main.0.js");
        bot = new Ranger();
        break;
    case "warrior":
        report_load_fail(11, "0-main.0.js");
        report_load_fail(13, "0-main.0.js");
        bot = new Warrior();
        break;
    case "priest":
        report_load_fail(11, "0-main.0.js");
        report_load_fail(13, "0-main.0.js");
        bot = new Priest();
        break;
    case "paladin":
        report_load_fail(11, "0-main.0.js");
        report_load_fail(13, "0-main.0.js");
        bot = new Paladin();
        break;
    default:
        game_log("No bot class found for " + character.ctype);
        break;
}

function on_party_invite(name) {
    if (isFriendly(name)) { accept_party_invite(name) }
}

function on_party_request(name) {
    if (isFriendly(name)) { accept_party_invite(name) }
}

function on_cm(name, data) {
    if (isFriendly(name)) {
        game_log("Received cm from: " + name)
        game_log(JSON.stringify(data))
    }
}

if (bot) {
    bot.start();
}

