# Design Notes

Notes on bot design

## Design Goal

Field a team of bots (merchant and 3 dynamic hunters) capable of progressing from lvl 1 to end game content without player intervention

Bot functionality is divided into parts: 
- `External Server`
    - Analytics of game data and bot logs (map info, node locations, monster strength/growth rates)
    - Calculate and provide pathing info to bots upon request
    - Calculate and provide targeted gear upgrades
    - Determine prioritized farming objectives for party
    - Provide visualization of analytics
    - Provide external persistence system (external to local storage)
    - Provide long term data awareness (hostile players, merchant deals, mine/fish nodes)
    - Supplement player interaction
- `Bot`
    - Handle base functionality for all classes
    - Uses timeouts to repeatedly handle tasks on a variable time basis
    - Relies of class extensions to provide extended or more appropriate implementations
    - Frameworks a lot of the code so extended classes only need to focus on specific code implementation
    - Instance variables:
        - start_time
        - total_xp_earned (since bot was started)
        - total_gold_acquired (since bot was started)
        - state (current state and data)
        - log
        - action_queue (this may be deprecated by current design)
        - move_manager (projecting that I will need a separate class to help handle move logic, unsure if this will prove true)
        - timeouts (so timeouts can be found and cancelled as needed)
        - config (any needed configuration info)
        - entities (regularly updated pull of nearby entities of interest)
- `Merchant`
    - Fill in for server if external functionality is lost/unavailable
    - Extend Bot Class
    - Maintain party
        - Start/Stop hunters to match current objective
        - External touch point for friends
        - Maintain continuity/objectives
    - Maintain item catalogue
        - Ensures situational awareness of current item status so I can reliably make item determinations from a standardized format without interacting with the bank
        - Will build/update catalogue from the bank, other decisions will use the catalogue
    - Improve gear
        - Determine if gold should be spent to attempt gear upgrades
        - If so determine desired improvement (upgrade/compound/attribute) and iterate on
            - Gather item(s) for desired_improvements[i]
            - Gather scroll(s) for desired_improvements[i]
            - Use relevant skill/ability
            - perform desired_improvements[i]
    - Resupply 
        - deliver missing potions
        - deliver improved gear
        - gather loot
    - Mine/Fish
        - Find and use mining/fishing nodes
    - Sales/interact with other players
        - Maintain reasonable for sale/purchase offers
        - Survey nearby players to see if there are any reasonable sale/purchase offers I can fulfill
            - This may include canceling a for sale offer so I have the items to sell to other player
        - Survey nearby players to see if there are any reasonable sale/purchase offers I should attempt to fulfill
            - Either by going to acquire desired item for one-off fulfillment or add to my reasonable deals that I offer so I can regularly fulfill when the time arises
    - Scout/Explore
        - Gather info about the map, other players, and monster stats
- `Hunter`
    - Extend Bot class
    - Work Target Priorities (*Should be receiving target priority from External Server/Merchant*)
        - Event (on_going && have_handler && can_handle)
        - Monster Hunt (should_hunt && can_handle)
        - Farm Material (merchant/server priority, may also provide target pack)
        - Regular Farm (default farm priority xp/gold/overflow material)
    - Monster Hunt
        - Rally at monsterhunt NPC
        - Get Quest
        - Build target pool from viable quests
        - If there is a target pool then iterate over pool until quests are completed then repeat Monster Hunt
        - Else transition to next objective state
    - Hunt
        - Done during Farming and monster hunt
        - Establish zone
        - Kite Target
            - Should intelligently choose targets based on other hunter actions
        - Use skills (attack/heal, potions/regen, class skills)
        - Transition packs as needed
    - Transition
        - Used to move party in 
- `<Hunter Classes>`
    - Extend Hunter
    - Implement any class specific logic/skills

## Names

Looking to use some thematic names with my normal xxIke gametag.

Warrior: SpartIke
Paladin: JustIke
Mage: MystIke
Priest: DivinelIke
Rogue: RoguelIke
Ranger: HawkIke
Merchant: VaultIke

## File Structure

```
src/Bot/
├── 01-main.1.js           # Entry point for bot initialization and loading
├── 02-consts.2.js         # Constants and configuration values
├── 03-characterUtils.3.js # Character utility functions
├── 04-monsterUtils.4.js   # Monster utility functions
├── 05-movement.5.js       # Movement logic and helpers
├── 06-logger.6.js         # Logger for debug/info/error output
├── 07-serverCoord.7.js    # Server coordination utilities
├── 10-bot.10.js           # Base Bot class
├── 11-hunter.11.js        # Hunter class (extends Bot)
├── 12-merchant.12.js      # Merchant class (extends Bot)
├── 13-mage.13.js          # Mage class (extends Hunter)
├── 14-rogue.14.js         # Rogue class (extends Hunter)
├── 15-ranger.15.js        # Ranger class (extends Hunter)
├── 16-warrior.16.js       # Warrior class (extends Hunter)
├── 17-priest.17.js        # Priest class (extends Hunter)
├── 18-paladin.18.js       # Paladin class (extends Hunter)
```

## Bot Design

### Timeouts

Timeouts will be used to track and execute specific handlers to ensure needed functionality is happening on a repeating basis but only when its needed next.
Timeout handlers will call their specified handler function on a timeout with a next_use variable, who's purpose will be to specific they next time that handler should need to execute

**Handlers**:
- Bot:
    - potion_handler: 
        - Purpose: Will determine which potion takes priority (health or mana) and then determine the appropriate potion to use (regen, pot0, pot1, potX).
    - entity_handler:
        - Purpose: Will survey parent.entities and populate that bot instance's entity tracker property.
    - log_handler:
        - Purpose: Ensure bot's logs are sent to external server or saved to local storage. Ensure bot is aligned with current party objective either from external server or merchant if server is offline
    - skill_handler:
        - Purpose: Will use skills based on bots current state, config variables, and tracked entities.
        - Bot implementation will just serve to framework the code needed but will rely on child classes to implement class specific skills/actions
    - state_handler:
        - Purpose: Call appropriate state handler for current state
        - Bot implementation will implement some universal states but will rely on child classes to implement any desired states
- Merchant:
    - hunter_handler:
        - Purpose: Maintain party composition and ensure hunters are tasked appropriately. Also check hunter inventory status to see if a supply run is needed.
    - sales_handler:
        - Purpose: Check tracked nearby entities for possible items to trade
    - skill_handler:
        - Purpose: extend bot implementation to implement any merchant specific skills
- Hunters:
    - kite_handler: 
        - Purpose: Ensure appropriate distance from target (target set through entity_handler)
    - attack_handler:
        - Purpose: Heal or Attack current priority target
- <Hunter Classes>:
    - skill_handler:
        - Purpose: extend bot implementation to implement any class specific skills


### States

States represent the current goals/objectives of a bot.

**States**:
- Bot:
    - Initial:
        - Purpose: Initial load of bot to join party, register self, and get party configuration/objective
        - data: None
    - Rally:
        - Purpose: Rallies with party at a given location
        - data: location
    - follow:
        - Purpose: Follow and support specific player (likely because they are being actively controlled by user instead of bot)
        - data: character to follow
    - transition:
        - Purpose: handle complex state transitions, likely those that require long stretches of movement
        - data: next state
    - evade:
        - Purpose: Evade danger and attempt to recover
        - data: next state
    - recover:
        - Purpose: stay passive and regen health/mana to max values
        - data: next state
- Merchant: 
    - intended state flow: inv_mgmt --> upgrade --> compound --> restock --> mine/fish --> sales --> inv_mgmt
    - inv_mgmt: (merchant initial state)
        - Purpose: Create a catalogue of all items currently in bank and character inventory and determine improvement/farming goals.
        - Will also attempt to buy needed items based on acquisition goals
    - upgrade:
        - Purpose: Use knowledge of item catalogue to upgrade gear
    - compound:
        - Purpose: Use knowledge of item catalogue to compound gear
    - restock:
        - Purpose: Purchase/Collect needed items to deliver to hunters, travel to hunters, provide restock and collect junk, and deliver to bank.
        - This may take multiple trips to collect junk if I wait to long and am unable to grab everything
        - This may trigger outside of normal/intended flow based on hunter needs
    - sales:
        - Purpose: Wander map/server based on config variables attempting to trade goods
        - If I manage to keep a known record of deals, may attempt to manage my own offerings to match what reliable sells
    - mine/fish:
        - Purpose: Wander map/server based on config variables attempting to mine/fish nodes
    - scout:
        - Purpose: wander map/server gathering greater information on monster packs/players/nodes
        - May become the parent state for sales and mine/fish as they will be similar, the specific child state will be the focused/optimized version, and this will be the general scouting and if opportunity arises for sales/mine/fish then do it.
- Hunter:
    - intended state flow:
        - valid states determined by merchant/external server
        - event --> monster_hunt --> farm_target_pack --> farm
    - hunt_target_pack: (hunter initial state)
        - Purpose: Will hunt target_pack until given new pack
        - Has all of the core logic for farming/hunting at a location (kite/attack) 
        - target pack is determined based on party objective
    - monster_hunt: 
        - Purpose: Get hunt quests from NPC and see if my current party strength is strong enough to handle any of them
    - event:
        - Purpose: Call corresponding event's handler logic to participate in server event
        
## External Server Design

Need to ensure that there is a local storage variable for each of the bot interaction points so the merchant can update that and hunters can reference it instead if the server is offline/unavailable

### User Display

- See avg xp gain per character
- See avg gold gain per character
- See avg gold gain total
- See deaths/died by
- See toughest enemy fought and won
- See filled inventory status (x of y)
- See gold status (total owned in bank)

### Bot interaction points

- Save logs/status for analysis
- Export game data (G, map, monster info, other scouting information)
- Request pathing support (get an array of travel waypoints for transitioning from x to y)
    - likely predetermined routes between known points of interest
    - may also queue path support based on current party location
    - maybe as points of interests are discovered, calculate for new node in system
- Get current party objective

## File Loading

Because the game uses it's own file architecture/load, main.js is responsible for coordinating file load.
Other files can assume that any lower numbered file will be loaded first and that they will have access to that files contents.
E.g. 10-bot is safe to assume that 03-characterUtils will be loaded for its own code and it does not need to do any kind of load for the code it wishes to use from 03-characterUtils