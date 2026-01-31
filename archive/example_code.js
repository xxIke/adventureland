// Get friends list
game.on('api_response', function (data) {
    if (data.type == "friends") {
        online_friends = data.chars || [];
    }
});

parent.api_call('pull_friends');

// Check valid move locations
point_a = { x: 28, y: 423, map: "main" };
point_b = { x: 88, y: 457, map: "main" };
point_c = { x: 137, y: 408, map: "main" };
point_d = { x: 28, y: 400, map: "main" };

function check_move(loc1, loc2) {
    return can_move(
        {
            map: loc1.map,
            x: loc1.x,
            y: loc1.y,
            going_x: loc2.x,
            going_y: loc2.y,
            base: character.base
        }
    );
}

log(`A->B: ${check_move(point_a, point_b)}`); // False, blocked
log(`B->C: ${check_move(point_b, point_c)}`); // False, blocked
log(`C->D: ${check_move(point_c, point_d)}`); // False, blocked
log(`D->A: ${check_move(point_d, point_a)}`); // True, not blocked

// Check_move cc cost

for (let i = 0; i < 1000; i++) {
    if (character.cc < 50) {
        check_move(point_a, point_b);
    }
    else {
        log("CC exceeded");
        break;
    }
}