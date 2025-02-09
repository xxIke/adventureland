/**
 * 4 - Movement System
 * 
 * Custome class for handling movement requests by bot.
 * Currently wrapper of smart_move() to ensure non-async calls don't request a smart_move 
 * whenever one is already queued.
 * Will eventually transition to my own movement system.
 * 
 */

const moveReturnCodes = {
    moveError: 0, // Error while attempting move request
    moveComplete: 1, // At requested destination
    movePending: 2, // Pathfinding currently in progress
    moveInProgress: 3 // Currently moving to target location
}

class MoveManger {
    constructor(timeout = 5000) {
        this.isMoving = false;
        this.moveLocation = null;
        this.timeStamp = null;
        this.timeout = timeout;
    }

    /**
     * 
     * @param {Object} location
     * @param {Number} location.x
     * @param {Number} location.y
     * @param {String} location.map 
     */
    move(location, timeout) {
        let ret = moveReturnCodes.moveError;
        if (this.isMoving) {
            // This is a new move request
            if ((location.x !== this.moveLocation.x)
                || (location.y !== this.moveLocation.y)
                || (location.map !== this.moveLocation.map)) {
                this.cancelMove();
            }
            else if (nearLocation(location, 5)) {
                ret = moveReturnCodes.moveComplete;
                this.cancelMove();
            }
            // We've already queued this request but we haven't found a route because smart_move is still searching
            else if (((Date.now() - this.timeStamp) > this.timeout) && !character.moving && !nearLocation(location, 5)) {
                this.cancelMove();
                return ret;
            }
            else {
                ret = character.moving ? moveReturnCodes.moveInProgress : moveReturnCodes.movePending;
            }
        }

        // If this is a new move request, either from overriding a previous or because we weren't moving
        if (ret === moveReturnCodes.moveError) {
            // See if we NEED smart_move()
            const mov_x = location.real_x ? location.real_x : location.x;
            const mov_y = location.real_y ? location.real_y : location.y;
            const canMoveObj = {
                map: character.map,
                x: character.real_x,
                y: character.real_y,
                going_x: mov_x,
                going_y: mov_y,
                base: character.base
            }

            // Short move
            if ((location.map && (character.map == location.map)) || nearLocation(location, character.speed)) {
                xmove(mov_x, mov_y)
                ret = moveReturnCodes.moveInProgress;
            }
            else {
                this.isMoving = true;
                this.moveLocation = { ...location };
                this.timeStamp = Date.now();
                this.timeout = timeout ? timeout : 5000;
                smart_move(location, {
                    success: () => {
                        this.isMoving = false;
                        this.moveLocation = null;
                        this.timeStamp = null;
                        this.timeout = 0;
                    },
                    fail: (reason) => {
                        this.isMoving = false;
                        this.moveLocation = null;
                        this.timeStamp = null;
                        this.timeout = 0;
                    }
                });
                ret = moveReturnCodes.movePending;
            };
        }

        return ret
    }

    cancelMove() {
        if (!this.isMoving) return;
        stop();
        this.isMoving = false;
        this.moveLocation = null;
        this.timeStamp = null;
        this.timeout = 0;
    }
}
