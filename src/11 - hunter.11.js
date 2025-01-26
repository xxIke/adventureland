// Code for hunter specfic things

load_code(10, () => { game_log("Failed to load code slot 10 from 11"); });

class Hunter extends Bot {
    constructor() {
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
        next_use = parent.next_skill.attack - Date.now();

        this.state_timeouts.attack_manager = setTimeout(() => { this.attack_manager(); }, next_use > 50 ? next_use : 50);
    }

    kite_manager() {
        game_log("Kite Manager not yet implemented");
        let next_use = 500

        this.state_timeouts.kite_manager = setTimeout(() => {
            this.kite_manager()
        }, next_use > 50 ? next_use : 50);
    }

    handle_state_idle() {
        game_log("Idle state not yet implemented");
        let next_use = 500;

        return next_use;
    }

    handle_state_recover() {
        game_log("Recover state not yet implemented");
        let next_use = 500;

        return next_use;
    }

    handle_state_evade() {
        game_log("Evade state not yet implemented");
        let next_use = 500;

        return next_use;
    }

    handle_state_transit() {
        game_log("Transit state not yet implemented");
        let next_use = 500;

        return next_use;
    }

    handle_state_hunt_target() {
        game_log("Hunt Target state not yet implemented");
        let next_use = 500;

        return next_use;
    }

    handle_state_event() {
        game_log("Event state not yet implemented");
        let next_use = 500;

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