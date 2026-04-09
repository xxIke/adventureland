# Intent: Movement

Covers long-distance travel, combat repositioning, kiting, fleeing, NPC navigation, and map awareness.

---

## Long-Distance Travel

- **What**: Pathfind across maps to a destination
- **MVP**: Use smart_move() for now with speed matched to slowest present party member. smart_move is a temporary solution — game developer notes it "isn't very smart or efficient."
- **End-state**: Full custom pathfinding and waypoint system. Coordinate movement across shared waypoints with high party sync. Common routes/highway system for faster reference/pathfinding.
- **Notes**: Currently implemented in movement.js. smart_move handles cross-map pathfinding internally. Systems should not build around smart_move's specific capabilities as it is not the target endstate.

## Combat Approach

- **What**: Move toward attack/heal target, stop at `character.range`
- **MVP**: Approach uses vector math with real_x/real_y and going_x/going/y to ensure appropriate approach is calculated, and stop at character.range * 0.8 to help mitigate/offset target movement. Melee characters approach and maintain close proximity.
- **End-state**: Approach may factor in terrain (avoid walking through hostile packs to reach target). Could add "leashing" — don't chase a target beyond a certain distance from the farm zone.
- **Notes**: Currently implemented. approach() never moves to target's exact position.

## Kiting

- **What**: Ranged and non-tank character being targeted by a hostile maintains maximum range to avoid enemy attacks while still being able to attack
- **MVP**: Reactive kite triggers when character.targets > 0 and character is ranged or not the party tank. Should calculate hostile monsters vector (direction of travel), and steer up to +/- 90 from the hostile vector to location still in range of target and is a valid move (don't stick on wall). Vector length should be calculated based on movement speed and frequency system is called. Character should ensure they are maintaining a max distance from hostile/target entities with max distance being the character range * 0.9 to help mitigate/offset other entity movement
- **End-state**: Smarter kiting — account for multiple hostiles (kite away from group center, not just one), predict hostile movement for preemptive positioning, kite toward party (safety) rather than away from hostile (isolation). Stay within bounded hunt location
- **Notes**: Currently implemented. The 70/30 weight split is a reasonable starting heuristic but may need tuning. If hostile IS the target, the character needs to maintain a band between hostile.range and character.range — this is geometrically constrained.
- **Notes (additional)**: When character.range < hostile.range (outranged), maximum distance should still be pursued for flee scenarios. Character cannot kite effectively when outranged — flee becomes the viable option.

## Flee

- **What**: At critically low HP with active threats, move away from all hostiles
- **MVP**: Flee activates when character.targets > 0 AND HP < fleeHpPercent. Moves away from average hostile position. Auto-exits when HP > fleeHpPercent * 1.5.
- **End-state**: Directional flee — prefer fleeing toward party members or safe zones rather than random direction. Flee toward healer if priest is in party.
- **Notes**: Currently implemented. Flee is "inviolable" — highest priority mode.

## Hold Ground

- **What**: Melee characters stop moving once within attack range of target
- **MVP**: After approach reaches character.range, melee does not move further.
- **End-state**: Hold ground with micro-adjustment — if target moves slightly, don't chase on every tick (dead zone to prevent jittering).
- **Notes**: Currently the approach check (`dist > character.range`) handles this implicitly.

## Defined Locations

- **What**: Known coordinates for important NPCs, bank, upgrade spot, vendors, transporters
- **MVP**: Query/use G for dynamic NPC location resolution.
- **End-state**: Already captured through MVP approach.
- **Notes**: 
  - NPC positions are resolvable from G data (G.maps[mapName].npcs[]). No need for hardcoded coordinates.
  - v2 used a central position near multiple NPCs to reduce movement. Key NPCs: Ernis (potions), Lucas (scrolls), Cue (upgrade/compound), Ponty (sell items) — all on mainland.

## NPC Navigation

- **What**: Travel to a specific NPC by name or role for game interactions (bank, buy, sell, upgrade)
- **MVP**: Query G for NPC location, travel via movement system. Movement system supports "move to {NPC_name}" as a request type.
- **End-state**: NPC query system — `findNPC('upgrades')` returns location from G.maps/G.npcs data. Handles NPCs that move (walking paths, boundary-constrained NPCs). Accounts for NPC interaction distance.
- **Notes**: 
  - smart_move does support NPC name navigation (e.g., `smart_move("bank")`), but systems should not build around smart_move capabilities — movement system is the intended interface.
  - Movement system will support named destination requests (NPC names, "bank", etc.) as a first-class feature.

## Map Transition Handling

- **What**: Handle door/portal/transporter usage when traveling between maps
- **MVP**: Handled implicitly by smart_move(). No explicit door or transporter management needed.
- **End-state**: Explicit map transition awareness — know which maps connect via doors/transporters, choose optimal routes, handle transition failures (door locked, transporter not available).
- **Notes**: smart_move handles cross-map travel internally. Explicit transition management only needed if smart_move proves unreliable for certain routes.

## Travel Retry with Backoff

- **What**: Retry failed smart_move attempts with increasing delay
- **MVP**: Standard smart_move() behavior. If failure occurs then teleport to town and try again.
- **End-state**: Dynamic pathfinding system no longer reliant on smart_move() (which is noted by developer as "despite the name, smart_move isn't very smart or efficient, it's up to the players to implement a better movement method")
- **Notes**: Currently implemented in movement.js.

## Party Travel Sync

- **What**: When traveling as a group, match speed to slowest member and move through checkpoints
- **MVP**: When traveling movement system will set character speed to slowest present party member speed and then travel. When near destination speed will be reset to full. This should ensure similar arrival times for longer transitions.
- **End-state**: Coordinated travel with speed matching, proximity and shared waypoints. Establish a common routes/highway system for quicker reference/pathfinding and then party travels designated waypoints while maintaining proximity.
- **Notes**: Party contract has travel coordination section with checkpoint protocol. Implementation deferred.
- **Why sync is required**: Aggressive packs attack without provocation — a lone arrival (likely not tank) invalidates party survival calculations. PvP zones have the same risk. Independent travel with "regroup at destination" is insufficient because the first arrival faces the full threat alone.
- **Distinction from Follow Objective**: Travel sync is bot-to-bot coordinated movement to a shared destination. Follow is continuous real-time tracking of a user-controlled character. Different mechanics, different objectives.
- **Merchant note**: Merchant stand must be closed before any movement (including travel sync). Stand reopens when movement completes. This applies to all merchant movement — short repositioning included.
