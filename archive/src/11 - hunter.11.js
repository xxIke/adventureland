// Code for hunter specfic things

load_code(10, () => { game_log("Failed to load code slot 10 from 11"); });

class Hunter extends Bot {
    constructor() {
        super()
        this.state_timeouts.attack_manager = null;
        this.state_timeouts.kite_manager = null;
        this.config.kite_manager_freq = 250;
        this.config.handle_state_freq = 1000;

    }

    start_bot() {
        super.start_bot();
        this.attack_manager();
        this.kite_manager();
    }

    attack_manager() {
        let next_use = 250;
        loot();
        // Kite manager should filter the data returned by entity manager to ensure my attack/heal target stay up to date
        // if (!this.entities.attack_target && !this.entities.heal_target) {
        //     this.select_target();
        // }
        // If I'm a healer and I have someone I both should and can heal -> heal
        if (this.entities.heal_target) {
            heal(this.entities.heal_target);
            next_use = parent.next_skill.attack - Date.now();
        }
        // If I have someone I can and should attack -> attack
        else if (this.entities.attack_target) {
            change_target(this.entities.attack_target);
            attack(this.entities.attack_target);
            next_use = parent.next_skill.attack - Date.now();
        }

        this.state_timeouts.attack_manager = setTimeout(() => { this.attack_manager(); }, next_use > 50 ? next_use : 50);
    }

    boundary_adjustment(x, y, boundary) {
        const [top_left_x, top_left_y, bottom_right_x, bottom_right_y] = boundary;
        let new_x = x;
        let new_y = y;

        if (x < top_left_x) {
            new_x = top_left_x;
            new_y = Math.abs(y - top_left_y) > Math.abs(y - bottom_right_y) ? top_left_y : bottom_right_y
        }
        else if (x > bottom_right_x) {
            new_x = bottom_right_x;
            new_y = Math.abs(y - top_left_y) > Math.abs(y - bottom_right_y) ? top_left_y : bottom_right_y
        }
        else if (y < top_left_y) {
            new_x = Math.abs(x - top_left_x) > Math.abs(x - bottom_right_x) ? top_left_x : bottom_right_x
            new_y = top_left_y
        }
        else if (y > bottom_right_y) {
            new_x = Math.abs(x - top_left_x) > Math.abs(x - bottom_right_x) ? top_left_x : bottom_right_x
            new_y = bottom_right_y
        }

        return [new_x, new_y]
    }

    kite_target(target) {
        if (!target) {
            // TODO-Medium-None
            // Need to make sure that I'm successfully acquiring targets?
            game_log("No target to kite");
            return;
        }


        const target_x = target.moving ? target.going_x : target.x;
        const target_y = target.moving ? target.going_y : target.y;

        const target_distance = Math.ceil(character.range * 0.9);
        const call_delta = this.config.kite_manager_freq / 1000;
        let move_distance = character.speed * call_delta;

        const dx = character.x - target_x;
        const dy = character.y - target_y;
        const current_distance = Math.sqrt(dx * dx + dy * dy);
        const dx_normal = dx / current_distance;
        const dy_normal = dy / current_distance;

        move_distance = Math.min(move_distance, Math.abs(current_distance - target_distance));

        let new_x = character.x + dx_normal * move_distance;
        let new_y = character.y + dy_normal * move_distance;

        // if (target.moving) {
        //     const target_dx = target.going_x - target.x;
        //     const target_dy = target.going_y - target.y;

        //     const target_new_x = target.x + target_dx * call_delta;
        //     const target_new_y = target.y + target_dy * call_delta;

        //     new_x += target_new_x - target.x;
        //     new_y += target_new_y - target.y;
        // }

        [new_x, new_y] = boundary_adjustment(new_x, new_y, boundary);
        move(new_x, new_y);
    }

    select_target() {
        this.entities.heal_target = null;
        this.entities.attack_target = null;

        if (character.ctype == "priest") {
            let missing_hp_max = 0;
            for (let target of this.entities.party_members) {
                let missing_hp_temp = target.max_hp - target.hp
                if ((missing_hp_temp) > missing_hp_max) {
                    missing_hp_max = missing_hp_temp;
                    this.entities.heal_target = target;
                }
            }

            if ((this.entities.heal_target.max_hp - this.entities.heal_target.hp) > Math.ceil(character.heal * 0.75)) {
                this.entities.attack_target = null;
                return;
            }
            else {
                this.entities.heal_target = null;
            }
        }

        // Check for hostile players
        let min_hp = null;
        for (let target of this.entities.hostile_players) {
            if (min_hp === null || (target.hp < min_hp)) {
                min_hp = target.hp;
                this.entities.attack_target = target;
            }
        }
        if (this.entities.attack_target) return;

        // Check for hostile monsters
        min_hp = null;
        for (let target of this.entities.hostile_monters) {
            if (min_hp === null || (target.hp < min_hp)) {
                min_hp = target.hp;
                this.entities.attack_target = target;
            }
        }
        if (this.entities.attack_target) return;

        // Check for special monsters
        min_hp = null;
        for (let target of this.entities.special_monsters) {
            if (min_hp === null || (target.hp < min_hp)) {
                min_hp = target.hp;
                this.entities.attack_target = target;
            }
        }
        if (this.entities.attack_target) return;

        // Check for target_monsters
        min_hp = null;
        for (let target of this.entities.target_monsters) {
            if (min_hp === null || (target.hp < min_hp)) {
                min_hp = target.hp;
                this.entities.attack_target = target;
            }
        }
    }

    kite_manager() {
        // Prioritize my targeting data based on entity info (entity manager should keep this info relevant)
        this.select_target();

        // Move to ensure my priority target is in my range (and I'm preferably out of their range)
        this.kite_target(this.entities.heal_target ? this.entities.heal_target : this.entities.attack_target);

        this.state_timeouts.kite_manager = setTimeout(() => { this.kite_manager() }, this.config.kite_manager_freq);
    }

    handle_state_idle() {
        game_log("Idle state not yet implemented");
        let next_use = 500;
        // Should only be here as an initial state I think

        // Grab/calculate whatever initial configs.

        // Wait for that to complete and to be part of a party

        // Head off to whatever next state should occur ???
        return next_use;
    }

    handle_state_recover() {
        game_log("Recover state not yet implemented");
        let next_use = 500;

        // Cool off, regen back up, then transition back to prev state

        return next_use;
    }

    handle_state_evade() {
        game_log("Evade state not yet implemented");
        let next_use = 500;

        // Regroup back in town (on a non-pvp server as relevant)

        return next_use;
    }

    handle_state_transit() {
        game_log("Transit state not yet implemented");
        let next_use = 500;

        // Handle long-haul movement or odd state transitions

        return next_use;
    }

    handle_state_hunt_target() {
        game_log("Hunt Target state not yet implemented");
        let next_use = 500;

        // If I'm not near target pack, need to turn off kite manager so my only movement is to the pack
        // Main movement might also be handled by transit state, so this might just be to reposition because I've kited far away

        // Ensure I'm near where I'm supposed to be
        // Ensure I'm opperating under valid assumptions (like party is grouped up)
        // Wait for those assumptions to become true as needed

        // Ensure that the kite/attack managers are running

        return next_use;
    }

    handle_state_event() {
        game_log("Event state not yet implemented");
        let next_use = 500;

        // Call relevent event handler for on-going event

        return next_use;
    }

    handle_states() {
        let next_use = 5000;

        switch (this.current_state.state_name) {
            case "idle":
                next_use = this.handle_state_idle()
                break;
            case "recover":
                next_use = this.handle_state_recover()
                break;
            case "evade":
                next_use = this.handle_state_evade()
                break;
            case "transit":
                next_use = this.handle_state_transit()
                break;
            case "hunt_target":
                next_use = this.handle_state_hunt_target()
                break;
            case "event":
                next_use = this.handle_state_event()
                break;

            default:
                game_log("State handler not yet implemented");
                break;
        }

        return next_use;
    }

}