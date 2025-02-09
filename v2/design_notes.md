# Design Notes

## File Structure

- 01-consts.1.js: Used to standardize references to objects (e.g. states, potions, priority, local_storage variables, etc...)
- 02-player_utils.2.js: bot independent functions to simiplify code for player related tasks (find_in_inventory, use_pot_x, is_friendly, etc...)
- 03-monsters.3.js: bot independent functions to simiplify code for monster related tasks (find_target_pack, dps_prediction, etc...)
- 04-move.4.js: custom movement system to replace smart_move
- 05-logger.5.js: Logger class for simlified debug logs that don't go to console
- 06-events.6.js: Event handler functions for server events
- 07 <-> 09: Reserved for future use as needed to split up code
- 10-main.10.js: Main file bots should load to handle loading the rest of target code depending on code base implementation (so I don't have to update each bot's main file)
- 11-bot.11.js: Main bot class that sets up necessary handlers and universal logic that is dependent class variables
- 12-merchant.12.js: Merchant class that extends bot class to handle merchant specific functionality (restock, sales, upgrade/compounds, hunter tasking, etc...)
- 13-hunter.13.js: Hunter class that extends bot class to handle hunt specific functionality (hunt task, monster_hunt, etc... )
- 14-rogue.14.js: Rogue class that extned hunter class to handle any rogue specific deviations and skill mechanics
- 15-ranger.15.js: Ranger class that extned hunter class to handle any ranger specific deviations and skill mechanics
- 16-warrior.16.js: Warrior class that extned hunter class to handle any warrior specific deviations and skill mechanics
- 17-priest.17.js: Priest class that extned hunter class to handle any priest specific deviations and skill mechanics
- 18-paladin.18.js: Paladin class that extned hunter class to handle any paladin specific deviations and skill mechanics
- 19-mage.19.js: Mage class that extned hunter class to handle any mage specific deviations and skill mechanics

## V4 Design

### Timeouts

Timeouts will be used to track and execute specific handlers to ensure needed functionality is happening on a repeating basis but only when its needed next.
Timeout handlers will call their specified handler function on a timeout with a next_use variable, who's purpose will be to specific they next time that handler should need to execute

**Handlers**:
- Bot:
    - potion_handler: 
        - Purpose: Will determine which potion takes priority (health or mana) and then determine the apprioritate potion to use (regen, pot0, pot1, potX).
        - next_use: based on which potion was used (regen is 2x the cooldown of pot).
          Will default to config variable for potion_handler_timeout if no potion was deemed necessary.
    - entity_handler:
        - Purpose: Will survey nearby entities and populate that bot instance's entity tracker property.
        - next_use: based on config variable for entity_handler_timeout
    - log_handler:
        - Purpose: Ensure bot's state/logs are saved to designated space in local storage for debugging or recovering from reset as needed
        - next_use: based on config varaible for log_handler_timeout
    - skill_handler:
        - Purpose: Will use skills based on bots current state, config variables, and tracked entities.
        - next_use: based on config variable for skill_handler_timeout
    - state_handler:
        - Purpose: Will manage bots current state and transition/correct as needed.
        - next_use: based on return from a specfic state_handler (e.g. hunt_target_handler).
          Will default to a config variable for state_handler_timeout as needed
- Merchant:
    - sales_handler:
        - Purpose: Check tracked nearby entities for possible items to trade
        - next_use: based on config variable for sales_handler_timeout
    - hunter_handler:
        - Purpose: Task hunters to hunt a specific monster type or pack.
          Will need to figure out desired strategy for determining desired hunt targets
        - next_use: based on config variable for hunter_handler_timeout
    - restock_handler:
        - Purpose: Check if hunters need more potions, to offload excess inventory, or to have updgraded gear delivered
        - next_use: based on config variable for restock_handler_timeout or should be able to be triggered by hunters
- Hunters:
    - kite_handler: 
        - Purpose: Determine priority target from tracked entities and maintain appropriate distance from entity
        - next_use: based on config variable for kite_handler_timeout
    - attack_handler:
        - Purpose: Heal or Attack current priority target
        - next_use: based on attack cooldown or defaults to config variable for attack_handler_timeout


### States

States represent the current goals/objectives of a bot.

**States**:
- Bot:
    - idle:
        - Purpose: Recover context/configuration as needed from reset, join party and group as needed, create static references for use such as valid monster packs, 
        - next_use: based on time delay desired before next state
        - next_state: idle if awaiting full party, recovered state if appropriate, merchant/hunter initial state
    - follow:
        - Purpose: Follow and support specific player (likely because they are being actively controlled by user instead of bot)
        - next_use: based on config variable for state_handler_timeout
        - next_state: merchant/hunter initial state
    - transition:
        - Purpose: handle complex state transitions, likely those that require long stretches of movement
        - next_use: based on if ready to transition to next state or defaults to config variable for state_handler_timeout
    - evade:
        - Purpose: Evade danger and attempt to recover
        - next_use: based on config variable for state_handler_timeout
    - recover:
        - Purpose: stay passive and regen health/mana to max values
        - next_use: based on config variable for state_handler_timeout
- Merchant:
    - inv_mgmt: (merchant initial state)
        - Purpose: Create a catalogue of all items currently in bank character inventories and prioritize acquisition goals.
          Will also attempt to buy needed items based on acquisition goals
        - next_use: time until next state handler should be called
        - next_state: upgrade
    - upgrade:
        - Purpose: Use knowledge of item catalogue to upgrade gear
        - next_use: time until next state handler should be called
        - next_state: compound
    - compound:
        - Purpose: Use knowledge of item catalogue to compound gear
        - next_use: time until next state handler should be called
        - next_state: restock if restock should occur, else check if I should do sales, mining, or fishing.
    - restock:
        - Purpose: Purchase/Collect needed items to deliver to hunters, travel to hunters, provide restock and collect junk, and deliver to bank.
          This may take multiple trips to collect junk if I wait to long and am unable to grab everything
        - next_use: If I have to make multiple trips this should trigger another restock immediately, else time until next state handler should be called
        - next_state: inv_mgmt
    - sales:
        - Purpose: Wander map/server based on config variables attempting to trade goods
        - next_use: based on sales_handler logic for when this needs to be called again or next state should occur
        - next_state: inv_mgmt if I attempt to buy something and don't have space or if there is a restock request, sales if I'm moving onto another sale location
    - mine:
        - Purpose: Wander map/server based on config variables attempting to mine nodes
        - next_use: based on mine_handler logic for when this needs to be called again or next state should occur
        - next_state: inv_mgmt if my inventory is close to full or if there is a restock request, mine if I'm moving onto another mine location
    - fish:
        - Purpose: Wander map/server based on config variables attempting to fish nodes
        - next_use: based on fish_handler logic for when this needs to be called again or next state should occur
        - next_state: inv_mgmt if my inventory is close to full or if there is a restock request, fish if I'm moving onto another fish location
- Hunter:
    - monster_hunt: (hunter initial state)
        - Purpose: Get hunt quests from NPC and see if my current party strength is strong enough to handle any of them
        - next_use: based on monster_hunt logic for grouping party at NPC, getting and evaluating quests, and transitions to monster_hunt target(s)
        - next_state: monster_hunt if there are still valid monster_hunt targets, event if there is an on-going event I have logic to handle, hunt_target if nothing else
    - hunt_target:
        - Purpose: Hunt target specified by merchant. This could be to farm a specific item or to prioritize gold acquistion or xp for party
        - next_use: based on config variable for state_handler_timeout
        - next_state: monster_hunt if all hunter's monster_hunt status has expired and new quests can be picked, event if there is an on-going event I have logic to handle, hunt_target if nothing else
    - event:
        - Purpose: Call corresponding event's handler logic to participate in server event
        - next_use: based on config variable for state_handler_timeout
        - next_state: event if I should continue to participate in event, monster_hunt if all hunter's monster_hunt status has expired, hunt_target if nothing else

## Merchant Notes

I don't yet have any insight into mining or fishing. 
I believe I will be able to combine the mine, fish, and sales states by calculating an optimized route on the server that takes me to every mine/fish node with minor deviations for monster packs that players like to farm so I can check for possible trade requests. Town will need to be part of this as well so I can check with the other stagnant merchants for trade requests

### Item catalogue

'''JSON
{
    itemName: {
        q: 0
        countByLevel: [0,1,2,3,4,5,6,7,8,9,x,y,z]
    }
}
'''

## Hunter notes

I wont be able to take on every monster_hunt quest.
They seem to be quests for the packs that haven't been touched in the longest time and some of them will have grown to strong for me to handle.
I think attempting to handle these hsould be a priority so I can collect the special currency

I haven't explored any events yet.
I think this can wait until the rest of the core logic is in place

## Local Storage

I'll end up saving a decent amount of information in local storage and also use it to passively communicate some non-critical information between bots.

**Information in LocalStorage**:
- Debug Log
    - Key: `<character_name>_DebugLog`
    - Value: Logged debug messages
- Info Log
    - Key: `<character_name>_InfoLog`
    - Value: Logged information messages
- Critical Log
    - Key: `<character_name>_CriticalLog`
    - Value: Logged critical messages
- Inventory Status
    - Key: `<character_name>_inv`
    - Value: Character's current inventory
- Hunt Target
    - Key: `huntTarget`
    - Value: The current pack that hunters should target
- Hunter Commander
    - Key: `huntCommander`
    - Value: Character in charage of coordinating hunter specific actions (e.g. monster_hunt)
- Monster Hunt Target
    - Key: `monsterHuntTarget`
    - Value: The current pack that hunters should target for monster_hunt
- Hunter Party Status
    - Key: `huntPartyStatus`
    - Value: Information used for hunter coordination

