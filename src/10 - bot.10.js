// Base utility that should be relevant for all

load_code(20, () => { game_log("Failed to load code slot 20 from 10"); });

function on_party_invite(name) {
    if (is_friendly(name)) { accept_party_invite(name) }
}

function on_party_request(name) {
    if (is_friendly(name)) { accept_party_invite(name) }
}

function on_cm(name, data) {
    if (is_friendly(name)) {
        game_log("Received cm from: " + name)
        game_log(JSON.stringify(data))
    }
}

var repeated_functions

class Bot {
    constructor() {
        this.state_timeouts = {
            potion_manager: null,
            skill_manager: null,
            log_manager: null,
            entity_manager: null,
        }

        this.current_state = {
            state_name: null,
            state_data: {},
            last_update: Date.now(),
        }

        this.config = {
            potion_consumption: null,
            upgrade_tier: null,
        }

        this.entities = {
            attack_target: null,
            heal_target: null,
            target_monsters: [],
            special_monsters: [],
            hostile_monters: [],
            hostile_players: [],
            party_members: [],
            players_offering_trade: [],
        }

        // TODO-High-none Move this with the bot initialization; this.x() will not work right, will have to use instance.x()....
        // map_key("4", "snippet", "this.run_test_code()");
    }

    start_bot() {
        this.potion_manager();
        this.entity_manager();
        this.skill_manager();
        this.log_manager();
    }

    get_potion_indexes() {
        let indexes = {
            hpot0: -1,
            hpot1: -1,
            hpotx: -1,
            mpot0: -1,
            mpot1: -1,
            mpotx: -1,
        };

        for (let pot in indexes) {
            let index = find_indexes_in_inv({ name: pot })[0]
            indexes[pot] = index !== undefined ? index : indexes[pot]
        }

        return indexes
    }

    determine_health_priority() {
        let ret = {
            priority: pot_priority.low,
            potion: "regen_hp"
        };
        let indexes = { pot0: -1, }

        return ret;
    }

    determine_mana_priority() {
        let ret = {
            priority: pot_priority.low,
            potion: "regen_mp"
        };

        return ret;
    }

    /**
     * 
     * @param {string} target_potion 
     */
    use_potion(target_potion) {
        if (!target_potion.includes("regen")) {
            use_skill(target_potion)
        }
        else {
            let indexes = this.get_potion_indexes();
            if (-1 != indexes[target_potion]) {
                swap(indexes[target_potion], 41)
            }
            else if (target_potion[4] == 'x') {
                target_potion.replace('x', '1');
                this.use_potion(target_potion)
            }
            else if (target_potion[4] == '1') {
                target_potion.replace('1', '0');
                this.use_potion(target_potion)
            }
            else if (target_potion[4] == '0') {
                if (target_potion.startsWith('h')) {
                    use_skill('regen_hp')
                }
                else if (target_potion.startsWith('m')) {
                    use_skill('regen_mp')
                }
                else {
                    game_log("Something has gone horrible wrong trying to use a potion");
                }
            }
        }
    }

    potion_manager() {
        // Get how long from now until we can use a potion/regen
        let next_use = parent.next_skill.use_hp - Date.now();

        // The cooldown has already expired
        if (next_use < 0) {
            let health_priority = this.determine_health_priority();
            let mana_priority = this.determine_mana_priority();
            if (health_priority.priority == pot_priority.na && mana_priority.priority == pot_priority.na) {
                if (health_priority.priority > mana_priority.priority) {
                    this.use_potion(health_priority.potion);
                }
                else {
                    this.use_potion(mana_priority.potion);
                }
                next_use = parent.next_skill.use_hp - Date.now();
            }
            else {
                next_use = 500;
            }
        }

        this.state_timeouts.potion_manager = setTimeout(() => { this.potion_manager(); }, next_use > 50 ? next_use : 50);
    }

    state_manager() {
        game_log("State Manager not yet implemented");
    }

    skill_manager() {
        game_log("Skill Manager not yet implemented");
    }

    log_manager() {
        game_log("Log Manager not yet implemented");
    }

    survey_nearby_entities() {
        var target_monsters = []
        var special_monsters = []
        var hostile_monters = []
        var hostile_players = []
        var party_members = []
        var players_offering_trade = []

        for (let id in parent.entities) {
            let current = parent.entities[id]
            if ((!current.visible) || current.dead || current.rip || (current.type == "npc")) continue

            // Process characters
            if (current.type == "character") {
                // This is (or should be) party member
                if ((character.owner == current.owner) || (character.party && (character.party == current.party))) {
                    party_members.push(current)
                }
                // This is someone targeting our party (TODO-low-none healing counts as target....)
                else if (current.targets && current.target && is_friendly(current.target)) {
                    hostile_players.push(current)
                }

                for (let slot in current.slots) {
                    if (!slot.includes("trade") || !current.slots[slot]) {
                        // Not a trade slot, or the trade slot is empty
                        continue;
                    }
                    else {
                        // They have something listed for trade
                        players_offering_trade.push(current);
                        break;
                    }
                }
            }
            // Process Monsters
            else if (current.type == "monster") {
                if (character.ctype == "merchant") {
                    if (current.target == character.name) {
                        hostile_monters.push(current);
                    }
                    else {
                        continue;
                    }
                }

                // TODO-HIGH-none Make sure this ligns up with possible hunter states data
                let current_target_type = this.current_state.state_data.type ? this.current_state.state_data.type : null

                // Check for special monsters
                if (current.mtype == "phoenix" || current.mtype == "mvampire") {
                    special_monsters.push(current)
                }

                // Check for target monsters
                if (current_target_type && current_target_type == current.mtype) {
                    target_monsters.push(current)
                }
                else if (!current_target_type) {
                    // TODO-low-none
                    // Maybe we add any in range we can 1-shot
                }

                if (current.target && is_friendly(current.target)) {
                    hostile_monters.push(current)
                }
            }
        }
    }

    maintain_party() {
        if (character.party) return;
        let oldest_char = null;
        let oldest_age = 0;
        let characters = get_characters();
        let party = get_party();
        let missing_party_member = []

        for (let c of characters) {
            if (c.online >= oldest_age) {
                oldest_char = c.name
                oldest_age = c.online
            }

            if (c.online > 0 && !party[c.name]) {
                missing_party_member.push(c.name)
            }
        }

        if (character.name == oldest_char) {

            for (let name of missing_party_member) {
                send_party_invite(name);
            }
        }
        else {
            send_party_request(oldest_char);
        }
    }

    entity_manager() {
        this.maintain_party();
        this.survey_nearby_entities();

        this.state_timeouts.entity_manager = setTimeout(() => { this.entity_manager(); }, 500);
    }

    run_test_code() {
        game_log("Currently no test code loaded");
    }
}