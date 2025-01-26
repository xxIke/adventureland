// Code for merchant specfic things

load_code(10, () => { game_log("Failed to load code slot 10 from 12"); });

class Merchant extends Bot {
    constructor() {
        this.state_timeouts.wishlist_manager = null
    }

    start_bot() {
        super.start_bot();
        this.wishlist_manager();
    }

    wishlist_manager() {
        game_log("Wishlist manager not yet implemented");
    }
}