/**
 * 5 - Movement System
 * 
 * Custom class for handling movement requests by bot.
 * Wraps smart_move if unable to use custom movement system.
 * 
 */

class MoveManager {
    constructor(timeout = 5000) {
        this.isMoving = false;
        this.moveLocation = null;
        this.timeStamp = null;
        this.timeout = timeout;
    }

    moveMangerConfirmClass() {
        return true;
    }

    checkMove(loc1, loc2) {
        if (!isLocationObject(loc1) || !isLocationObject(loc2)) {
            return false;
        }
        if (loc1.map != loc2.map) {
            return false;
        }
        if (loc1.map != null) {
            loc1.map = character.map;
        }

        return can_move({
            map: loc1.map,
            x: loc1.x,
            y: loc1.y,
            going_x: loc2.x,
            going_y: loc2.y,
            base: character.base
        });
    }

}