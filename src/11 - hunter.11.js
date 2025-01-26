// Code for hunter specfic things

load_code(10, () => { game_log("Failed to load code slot 10 from 11"); });

class Hunter extends Bot {
    constructor() {
        super()
        this.state_timeouts.attack_manager = null
        this.state_timeouts.kite_manager = null

    }

    start_bot() {
        super.start_bot();
        this.attack_manager();
        this.kite_manager();
    }

    attack_manager() {
        game_log("Attack Manager not yet implemented");

        // Kite manager should filter the data returned by entity manager to ensure my attack/heal target stay up to date

        // If I'm a healer and I have someone I both should and can heal -> heal

        // If I have someone I can and should attack -> attack

        let next_use = parent.next_skill.attack - Date.now();
        this.state_timeouts.attack_manager = setTimeout(() => { this.attack_manager(); }, next_use > 50 ? next_use : 50);
    }

    kite_manager() {
        game_log("Kite Manager not yet implemented");
        let next_use = 500

        // Prioritize my targeting data based on entity info (entity manager should keep this info relevant)
        // Move to ensure my priority target is in my range (and I'm preferably out of their range)

        this.state_timeouts.kite_manager = setTimeout(() => { this.kite_manager() }, next_use > 50 ? next_use : 50);
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