# Intent: Movement

Covers long-distance travel, combat repositioning, kiting, fleeing, NPC navigation, location resolution, and map awareness.

---

## Location Resolution

- **What**: Centralized "where is X?" resolution from game data — NPCs, monster spawns, map keywords
- **MVP**: New `src/location.js` utility module. Resolves NPC names/ids, monster types, and keywords ("bank", "upgrade", "potions") to `{ coord: { x, y, map } }` using `G.maps` and `G.npcs` data. `findNPCLocation(npcId)` is the single interface for all NPC lookups — no per-NPC convenience wrappers.
- **End-state**: Smart resolution with proximity preference (nearest bank across maps), cached lookups, walking-NPC position tracking (NPCs with `positions` arrays move along paths).
- **Notes**: Extracted from `objective.js` where `findMonsterLocation`, `findBankLocation`, `findPontyLocation` were implemented inline. This is a shared utility, not a system — no scheduler registration, no ctx ownership. Used by Objective (primary consumer, sets `ctx.objective.location`) and potentially other systems. Movement does NOT resolve locations — it receives coordinates via `ctx.objective.location.coord`.

## Pathfinding and Travel Internals

- **What**: Internal travel implementation — how the movement system gets characters from point A to point B
- **MVP**: `smart_move()` wrapper strategy. The external contract is agnostic of travel implementation — dependents see "travel to coord" not "smart_move to coord." No system should build around `smart_move()` capabilities.
- **End-state**: Own pathfinding using `G.geometry` x_lines/y_lines collision data, visibility-graph routing, cross-map routing via doors/transporters. `smart_move()` becomes emergency fallback only. Reference: ALClient `Pathfinder.ts` demonstrates A* over Delaunay triangulation of wall corners; game server `old_moves.js` shows the line-intersection algorithm `can_move()` uses.
- **Why agnostic**: The movement contract must survive internal pathfinding iteration. Other systems set `ctx.objective.location` and movement handles the how. When pathfinding improves, no dependent system needs to change. Strategy pattern encapsulates the implementation — swap strategies to change travel behavior.
- **Notes**: Game developer says `smart_move` "isn't very smart or efficient, it's up to the players to implement a better movement method." It uses 15px-step BFS with `can_move()` validation, door/transporter exploration, and path smoothing. Coarse-grained and slow. Custom pathfinding can do much better but is not MVP-blocking.

## Long-Distance Travel

- **What**: Pathfind across maps to a destination
- **MVP**: Use `smart_move()` for now with speed matched to slowest present party member via `cruise()`. smart_move is a temporary solution — game developer notes it "isn't very smart or efficient."
- **End-state**: Full custom pathfinding and waypoint system. Coordinate movement across shared waypoints with high party sync. Common routes/highway system for faster reference/pathfinding.
- **Notes**: Currently implemented in movement.js. smart_move handles cross-map pathfinding internally. Systems should not build around smart_move's specific capabilities as it is not the target endstate. The movement contract abstracts travel behind a strategy — when pathfinding replaces smart_move, no contract changes needed.

## Combat Approach

- **What**: Move toward attack/heal target, stop at effective range
- **MVP**: Approach uses vector math with `real_x`/`real_y` and `going_x`/`going_y` (when `target.moving`) for position prediction. Stop at `character.range * 0.8` to buffer against target movement — ensures character stays in range even as targets shift position between ticks. All approach movement validates destination with `can_move_to()` before committing; if intended position is blocked, iterate directions to find a valid alternative.
- **End-state**: Approach may factor in terrain (avoid walking through hostile packs to reach target). Could add "leashing" — don't chase a target beyond a certain distance from the farm zone.
- **Notes**: approach() never moves to target's exact position. The 0.8 range buffer is conservative — better to be slightly closer than to oscillate at range boundary.

## Kiting

- **What**: Ranged and non-tank character being targeted by a hostile maintains maximum range to avoid enemy attacks while still being able to attack
- **MVP**: Reactive kite triggers when `character.targets > 0` AND (character is not the party tank OR character is ranged). Multiple attackers: use nearest attacker as the kite target. Calculate the attacker's movement vector (direction of travel), then steer up to ±90° from that vector to a position that is still in range of the attack/heal target and is a valid move (`can_move_to()` — don't kite into walls/obstacles). If intended position is blocked, iterate angles to find a valid alternative. Vector length should be `character.speed * (delay / 1000)` — how far the character can actually move before the next tick. This vector length calculation also applies to approach logic for understanding projected positions of both character and enemies. Character should maintain max distance from hostile/target entities with max distance being `character.range * 0.9` to help mitigate/offset other entity movement. If range with attack/heal target cannot be maintained while kiting, move as close as possible to the target. Always kite regardless of range comparison — kiting when outranged still increases distance from hostile and improves flee viability if flee becomes necessary.
- **End-state**: Smarter kiting — tune kite direction and vector length to also maintain positioning around farm location. Predict hostile movement for preemptive positioning. Kite toward party (safety) rather than away from hostile (isolation). Stay within bounded hunt location.
- **MVP enhancements** (designed, not yet implemented):
  - Farm zone awareness: penalize kite directions that leave `ctx.objective.location` boundary area
  - Party safety: prefer kiting toward party centroid (via `ctx.world.partyMembers`) when available
- **Notes**: Kite direction is up to ±90° from attacker's movement vector, constrained by maintaining range with attack/heal target. If hostile IS the target, the character needs to maintain a band between hostile.range and character.range — this is geometrically constrained.
- **Notes (additional)**: When character.range < hostile.range (outranged), maximum distance should still be pursued. Character cannot kite effectively when outranged but the movement still improves flee viability and reduces incoming damage frequency.

## Flee

- **What**: At critically low HP with active threats, move away from all hostiles
- **MVP**: Flee activates when character.targets > 0 AND HP < fleeHpPercent. Moves away from average hostile position. Auto-exits when HP > fleeHpPercent * 1.5. Validates flee destination with `can_move_to()` before committing; iterates directions if blocked. If flee fails repeatedly (cornered with no valid escape direction), `use("town")` as emergency teleport escape.
- **End-state**: Directional flee — prefer fleeing toward party members or safe zones rather than random direction. Flee toward healer if priest is in party.
- **MVP enhancements** (designed, not yet implemented):
  - Party-aware flee direction: if `ctx.world.partyMembers` has entries, prefer fleeing toward party centroid
  - Healer-aware flee: weight flee direction toward party healer if present
- **Notes**: Currently implemented. Flee is "inviolable" — highest priority mode.

## Hold Ground

- **What**: Melee characters stop moving once within attack range of target
- **MVP**: After approach reaches `character.range * 0.8`, melee does not move further toward target. Responsive movement is maintained — no dead zone. Jitter from frequent repositioning may help with mechanics not yet addressed (e.g., dodging incoming attacks, position-dependent damage).
- **End-state**: Hold ground with micro-adjustment possibilities if needed by future mechanics.
- **Notes**: The approach check (`dist > character.range * 0.8`) handles this. Responsive movement means the character will re-approach immediately if pushed out of range, which keeps combat engagement tight.

## Defined Locations

- **What**: Known coordinates for important NPCs, bank, upgrade spot, vendors, transporters
- **MVP**: Query/use G for dynamic NPC location resolution via location service (`src/location.js`). `findNPCLocation(npcId)` resolves any NPC by id. `resolveLocation(keyword)` handles keyword-to-NPC mapping (e.g., "bank" → banker NPC role lookup).
- **End-state**: Already captured through MVP approach.
- **Notes**: 
  - NPC positions are resolvable from G data (G.maps[mapName].npcs[]). No need for hardcoded coordinates.
  - v2 used a central position near multiple NPCs to reduce movement. Key NPCs: Ernis (potions), Lucas (scrolls), Cue (upgrade/compound), Ponty (sell items) — all on mainland.

## NPC Navigation

- **What**: Travel to a specific NPC by name or role for game interactions (bank, buy, sell, upgrade)
- **MVP**: Location service resolves NPC id/name to coordinates. Objective sets `ctx.objective.location` using location service. Movement reads coordinates and travels. Movement does NOT resolve names itself — location resolution is a utility concern, not a movement system concern.
- **End-state**: NPC query system — `findNPCLocation('upgrades')` returns location from G.maps/G.npcs data. Handles NPCs that move (walking paths, boundary-constrained NPCs). Accounts for NPC interaction distance.
- **Notes**: 
  - smart_move does support NPC name navigation (e.g., `smart_move("bank")`), but systems should not build around smart_move capabilities — the location service + movement system is the intended interface.
  - The location service is the "where", movement is the "how to get there."

## Map Transition Handling

- **What**: Handle door/portal/transporter usage when traveling between maps
- **MVP**: Handled implicitly by smart_move(). No explicit door or transporter management needed. Location service provides `getMapTransitions(mapName)` to expose available transitions for future use.
- **End-state**: Explicit map transition awareness — know which maps connect via doors/transporters, choose optimal routes, handle transition failures (door locked, transporter not available).
- **Notes**: smart_move handles cross-map travel internally. Explicit transition management only needed if smart_move proves unreliable for certain routes or when custom pathfinding replaces it.

## Travel Retry with Backoff

- **What**: Retry failed travel attempts with increasing delay
- **MVP**: If travel fails, retry up to 3 times with 2s backoff. After 3 failures, call `use("town")` to teleport to safety, then retry once more from town. This is an internal implementation detail — the external contract just says "travel with retry."
- **End-state**: Dynamic pathfinding system no longer reliant on smart_move() (which is noted by developer as "despite the name, smart_move isn't very smart or efficient, it's up to the players to implement a better movement method")
- **Notes**: Currently implemented in movement.js (without town teleport fallback — to be added).

## Party Travel Sync

- **What**: When traveling as a group, match speed to slowest member and move through checkpoints
- **MVP**: When traveling movement system will set character speed to slowest present party member speed via `cruise(slowestSpeed)` and then travel. When near destination speed will be reset to full via `cruise(500)`. This should ensure similar arrival times for longer transitions.
- **End-state**: Coordinated travel with speed matching, proximity and shared waypoints. Establish a common routes/highway system for quicker reference/pathfinding and then party travels designated waypoints while maintaining proximity.
- **Notes**: Party contract has travel coordination section with checkpoint protocol. Implementation deferred.
- **Why sync is required**: Aggressive packs attack without provocation — a lone arrival (likely not tank) invalidates party survival calculations. PvP zones have the same risk. Independent travel with "regroup at destination" is insufficient because the first arrival faces the full threat alone.
- **Distinction from Follow Objective**: Travel sync is bot-to-bot coordinated movement to a shared destination. Follow is continuous real-time tracking of a user-controlled character. Different mechanics, different objectives.
- **Merchant note**: Merchant stand must be closed before any movement (including travel sync). Stand reopens when movement completes. This applies to all merchant movement — short repositioning included.

## Universal Combat Positioning Rule

All combat movement (approach, kite, flee) must validate destinations with `can_move_to()` before committing. If the intended position is blocked, iterate to find a valid alternative direction. This ensures characters never attempt to move into walls or obstacles, and always have a fallback when their preferred direction is blocked. This is a contract-level guarantee applicable to all movement strategies.
