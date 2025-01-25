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
            log_manager: null
        }

        this.current_state = {
            state_name: null,
            state_data: null,
            last_update: null,
        }

        this.config = {
            potion_consumption: null,
            upgrade_tier: null,
        }
    }

    start_bot() {
        this.potion_manager();
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

        this.state_timeouts.potion_manager = setTimeout(() => { this.potion_manager(); }, next_use);
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
}