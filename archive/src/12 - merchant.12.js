// Code for merchant specfic things

load_code(10, () => { game_log("Failed to load code slot 10 from 12"); });

class Merchant extends Bot {
    constructor() {
        super()
        this.state_timeouts.wishlist_manager = null
    }

    start_bot() {
        super.start_bot();
        this.wishlist_manager();
    }

    wishlist_manager() {
        game_log("Wishlist manager not yet implemented");
        let next_use = 500;

        this.state_timeouts.wishlist_manager = setTimeout(() => { this.wishlist_manager() }, next_use > 50 ? next_use : 50);
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

    handle_state_event() {
        game_log("Event state not yet implemented");
        let next_use = 500;

        return next_use;
    }

    handle_state_inventory_management() {
        game_log("Inventory Management state not yet implemented");
        let next_use = 500;

        return next_use;
    }

    handle_state_compound() {
        game_log("Compound state not yet implemented");
        let next_use = 500;

        return next_use;
    }

    handle_state_upgrade() {
        game_log("Upgrade state not yet implemented");
        let next_use = 500;

        return next_use;
    }

    handle_state_restock() {
        game_log("Restock state not yet implemented");
        let next_use = 500;

        return next_use;
    }

    handle_state_sales() {
        game_log("Sales state not yet implemented");
        let next_use = 500;

        return next_use;
    }

    handle_state_mine() {
        game_log("Mine state not yet implemented");
        let next_use = 500;

        return next_use;
    }

    handle_state_fish() {
        game_log("Fish state not yet implemented");
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
            case "event":
                next_use = this.handle_state_event()
                break;
            case "inventory_management":
                next_use = this.handle_state_inventory_management()
                break;
            case "compound":
                next_use = this.handle_state_compound()
                break;
            case "upgrade":
                next_use = this.handle_state_upgrade()
                break;
            case "restock":
                next_use = this.handle_state_restock()
                break;
            case "sales":
                next_use = this.handle_state_sales()
                break;
            case "mine":
                next_use = this.handle_state_mine()
                break;
            case "fish":
                next_use = this.handle_state_fish()
                break;

            default:
                game_log("State handler not yet implemented");
                break;
        }

        return next_use;
    }
}