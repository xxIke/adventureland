# Intent: World Knowledge, Gathering, Crafting & Social

Covers entity classification, game data usage, monster assessment, gathering skills, crafting systems, and social features.

---

## Entity Classification

- **What**: Categorize all nearby entities into actionable groups (party, hostiles, targets, special, trade)
- **MVP**: WorldModel single-pass classifies: partyMembers, hostileMonsters, hostilePlayers, targetMonsters, specialMonsters, easyMonsters, charactersOfferingTrade.
- **End-state**: Add sub-classifications — quest targets (for active monster hunts), dangerous monsters (above party capability), resource nodes (fishing/mining zones nearby).
- **Notes**: Currently implemented in world-model.js.

## Monster Spawn Lookup

- **What**: Find where a monster type spawns from G.maps static data
- **MVP**: Scans G.maps for matching pack type, returns center of spawn boundary.
- **End-state**: Return all spawn locations for a type (multiple maps/zones). Include pack metadata (count, growth flag, boundary size). Cache results since G data is static. Have scouting tasks that supply supplemental data through localStorage
- **Notes**: Currently implemented in objective.js findMonsterLocation(). Only returns first match.

## Monster Danger Assessment

- **What**: Score monster threat level from game data (HP, attack, range, speed, abilities)
- **MVP**: Calculate monster DPS and subsequent ttk party member (tank) and party DPS and subsequent ttk monster (estimated against lvl 1, lvl 12, and lvl 20 monster)
- **End-state**: Comprehensive danger score also factoring in damage (phys/mag) and mitigation (armor/resistance) types for more accurate time to kill numbers, assessment for pack hostility (to estimate likely hood of calculating DPS/TTK against multiple simultaneous monsters rather than 1), more persistent assessments for level of threat from the monster (i.e. lvl 1 is little threat and safe to farm but higher level versions require high party cohesion/tactics or is flat unsafe above certain levels). Revaluation at target to ensure expectations match reality
- **Notes**: The monster growth model is documented in game-api.md (HP scales linearly forever, other stats cap at level 12). This matters for packs with grow:true flag.
- **Notes (additional)**: A grow pack grows faster than normal. Make base estimates against level 1, level 12, and level 20 monsters (20 is a consistent high level for untouched packs). Server doesn't expose current pack level directly — read live entity stats and compare against G.monsters base stats to estimate.

## Pack/Zone Reasoning

- **What**: Reason about monster spawn zones as a whole, not just individual entities
- **MVP**: Objective resolves farm target to zone center from G.maps boundary data. No zone-level reasoning beyond "go to center".
- **End-state**: Zone awareness — know zone boundary, calculate optimal farming position within zone (center for even pulls, edge for escape routes), detect zone occupancy (other players farming there), evaluate zone density (count * respawn rate = sustained farming potential).
- **Notes**: G.maps[map].monsters[].boundary gives [x1,y1,x2,y2] for each pack.

## NPC Location Database

- **What**: Know where important NPCs are for navigation (bank, vendors, upgrade, quest)
- **MVP**: Query/retrieve NPC location
- **End-state**: Expand to be able to query by item being sought to find NPC who sells it and return NPC location
- **Notes**: G.maps[mapName].npcs[] contains NPC positions per map. G.npcs[id] has NPC role/type data.
- **Notes (additional)**: Movement system (not smart_move) is the target interface for NPC navigation. Movement system will support named destination requests. NPC locations resolvable from G.maps[mapName].npcs[] and G.npcs[id].

## Map PvP Awareness

- **What**: Know whether current map is a PvP zone to adjust behavior
- **MVP**: Know if in PvP zone and if entity monitoring/combat needs to account for hostile characters
- **End-state**: Adjust behavior when in PvP zones to enhance bot success; track known hostile players (who will shoot on sight) and should be treated as hostile before they target characters.
- **Notes**: Game data has pvp flag per map.

## Monster Growth Model

- **What**: Understand how monsters in "grow" packs scale with level over time
- **MVP**: Not needed for active decision-making. Documented in game-api.md for reference.
- **End-state**: Factor growth model into danger assessment — a grow pack at level 20 has 10x the HP of level 1 but same attack (capped at level 12). Higher-level grow packs give more XP but take longer to kill.
- **Notes**: Growth formulas documented: HP += floor(base_hp/2) per level (no cap), attack *= (1 + min(lvl,12)*0.05) for grow packs.

## Friendly Entity Detection

- **What**: Identify characters belonging to same account, party, or friends list
- **MVP**: WorldModel checks entity.owner === character.owner and config.friendlyPlayers list. Friendly entities excluded from hostile classification.
- **End-state**: Same core logic. May add dynamic friend detection by programmatic query of game for friends list (unverified how to achieve).
- **Notes**: Currently implemented. Important for avoiding false-positive hostile detection (healers targeting party members set entity.target which looks hostile without friendly check).

---

## Crafting

## Item Crafting

- **What**: Use `craft()` to combine items per recipes in G.craft/D.craftmap
- **MVP**: Not needed for MVP. Higher stage of gear progression beyond just purchasing standard gear for gold or finding gear drops
- **End-state**: Merchant checks craft recipes against available materials. If needed crafts are possible, execute at craftsman NPC. Requires recipe knowledge from G.craft data.
- **Notes**: craft() requires nearby craftsman NPC and specific item combinations.
- **Notes (additional)**: Crafting is one of the stages/mechanics for gear progression. See gear-progression.md for how crafting fits into the acquisition pipeline.

## Item Exchange

- **What**: Convert items via exchange NPC using `exchange()` — seasonal tokens, collectibles
- **MVP**: Not needed for MVP. Higher stage of gear progression beyond just exchanging gold for standard gear or finding gear drops
- **End-state**: Merchant checks exchangeable items in item catalogue against desired items. If needed items can be exchanged for, travel to exchange NPC and execute.
- **Notes**: Exchange is an async operation (3-6 seconds). Common for seasonal event items.

## Token Collection

- **What**: Track monster token accumulation from hunt quest rewards
- **MVP**: Implicit — completing monster hunts awards tokens. No explicit tracking needed for MVP.
- **End-state**: Track token balance, plan token spending (exchange tokens for valuable items at specific NPCs), prioritize hunts based on token accumulation goals.
- **Notes**: Monster hunt reward is 1 token (100 in hardcore). Tokens are spent at exchange NPCs for gear.

## Acquisition Awareness

- **What**: Know which items require crafting vs direct drops (from monster or map) vs exchange, plan material acquisition
- **MVP**: Not needed for MVP.
- **End-state**: Merchant checks if party needs items obtainable only through crafting/exchange. Directs hunters to farm needed items/material, executes acquisition, delivers results/attempts improvements.
- **Notes**: Requires parsing G for how to acquire items as well as drop tables to build a dependency graph.

## Shell Economy

- **What**: Track and use shells (premium currency from achievements)
- **MVP**: Not needed for MVP.
- **End-state**: Track shell balance. Identify shell-purchasable items that would benefit the party. Some items are only available for shells.
- **Notes**: Shells earned from achievements. buy_with_shells() exists for shell purchases.

---

## Gathering

## Fishing

- **What**: Travel to fishing zone, equip fishing rod, use `use_skill("fishing")` repeatedly
- **MVP**: Not needed for MVP. Fishing is a specialized activity.
- **End-state**: Merchant or idle hunter can fish during downtime. Travel to fishing zone, equip rod, fish until inventory full or called away. Requires fishing rod in mainhand slot.
- **Notes**: Unsure how to actually locate fishing zones
- **Notes (additional)**: Not yet explored at sufficient character level. Implementation details, zone locations, and profitability unknown.

## Mining

- **What**: Travel to mining zone, equip pickaxe, use `use_skill("mining")` repeatedly
- **MVP**: Not needed for MVP. Mining is a specialized activity.
- **End-state**: Same pattern as fishing but at mining zones with pickaxe equipment.
- **Notes**: Not yet explored at sufficient character level. Mining zone locations and profitability unknown.

---

## Social & Advanced

## Friends System

- **What**: Manage friends list for broader party coordination
- **MVP**: config.friendlyPlayers list serves as the friend filter. No dynamic friend management needed.
- **End-state**: Read from programmatic/dynamic friendly detection. 
- **Notes**: Programmatic friend list access method not yet identified.

## Tracker Device and Passive Buffs

- **What**: Track monster kills to unlock persistent passive buffs
- **MVP**: Hunters keep tracker device in inventory (already in keep list). Tracker must be in inventory during kills to receive credit. No bot logic needed — passive mechanic.
- **End-state**: Buff farming objective — direct hunters to farm specific monsters to unlock target passive buffs. Track progress toward buff unlock thresholds.
- **Notes**: Skills are also gated behind level progression and certain gear items. Gear progression weighs more heavily on stats than level progression. The game does not have stat points to spend during level-up.

## Tavern/Gambling

- **What**: Tavern games and betting mechanics
- **MVP**: Not relevant.
- **End-state**: Possibly automate profitable tavern games if expected value is positive. 
- **Notes**: Risk/reward system. Suspected method to analyze rand implementation for profit.

## Magiport/Teleport

- **What**: Mage teleports party members to their location
- **MVP**: Not needed for MVP. Characters travel independently.
- **End-state**: Mage uses magiport to summon party members for fast regrouping after respawn or farm target change. Accept incoming magiports from friendly mages.
- **Notes**: Magiport is a mage-specific utility skill. Default MVP party is paladin, ranger, priest, merchant. All character classes are supported in rotation — mage, warrior, rogue can be swapped in with no-op skill strategies. MVP skill priorities are authored for the 4 default classes.
