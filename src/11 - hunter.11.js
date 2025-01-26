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
    }


}