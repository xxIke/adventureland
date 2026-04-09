# Intent: Objective

Covers high-level goal management, farm target selection, hunts, events, and strategy patterns.

---

## Farm Objective

- **What**: Set monster type + location, travel there, farm in a loop
- **MVP**: Hunter strategy reads config.farmTarget, resolves spawn location from G.maps, transitions: idle -> travel -> farm. Targeting reads objective type to enable full priority chain during farm.
- **End-state**: Dynamic farm target selection based on party capability, XP/gold efficiency, and monster availability. Re-evaluate periodically (every few minutes) and switch targets if better option available.
- **Notes**: Currently implemented in objective.js. Farm target is static (from config/localStorage). Merchant sets farm target for the party.

## Travel Objective

- **What**: Travel to a distant location (farm zone, bank, NPC)
- **MVP**: Objective sets type='travel' with location.coord when character is not at farm zone. Movement reads location and enters travel mode.
- **End-state**: Multi-waypoint travel for complex routes. Priority interruption (hostile detected during travel, event spawn nearby).
- **Notes**: Currently implemented. Travel is implicit when farm location differs from current position.

## Recover Objective

- **What**: Handle death/critical HP state
- **MVP**: Objective detects character.rip and sets type='recover'. Systems idle during recovery. character calls respawn when debuff has expired and is ready for respawn (approx 15s after death)
- **End-state**: Active recovery sequence — call respawn(), wait for HP/MP regen, then resume previous objective. Track "died at X" for death avoidance.
- **Notes**: Currently detect-only. Missing the respawn() call and resume logic. See recovery.md for respawn intent.

## Idle Objective

- **What**: Default state when no farm target or directives exist
- **MVP**: Character stands idle, targeting goes defensive-only. Regen is prioritized over potion consumption
- **End-state**: Idle should actively seek work — check if hunts are available, if events are active, if merchant needs help. Idle is temporary, not a destination.
- **Notes**: Currently implemented as fallback when no farmTarget configured.

## Follow Objective

- **What**: Follow a user-controlled character, providing automated support
- **MVP**: Not needed for MVP.
- **End-state**: Allows user to manually control one character while other bots follow and support. Character sends CM to initiate user-controlled character as leader. Bots maintain proximity to leader, attack leader's target, and provide support (healing, buffs). Distinct from travel sync — follow is continuous real-time tracking of a player-controlled character, not coordinated bot-to-bot travel.
- **Notes**: Contract defines follow type but implementation deferred.

## Event Objective

- **What**: Detect server events, evaluate worth, travel to event, participate
- **MVP**: Not needed for MVP. Events are periodic and optional.
- **End-state**: Event detection from game signals (on_game_event or polling). Evaluate event reward, party needed to handle event, and logic support for event. If able to participate and rewards are of value (generally true) participate.
- **Notes**: Neither v2 nor hyper-fixate fully implemented event participation. The game has many event types (daily, nightly, seasonal) with different mechanics.
- **Notes (additional)**: Events are detected via a subscribable game signal. Event rewards are generally worthwhile. There are multiple event types, each requiring unique participation logic (mostly find-and-fight). Full event type catalog not yet explored.

## Monster Hunt Quest

- **What**: Accept hunt from NPC, kill required count of target monster, return to NPC for reward (monster tokens)
- **MVP**: Hunters travel to monsterhunt NPC, accept hunts, store hunt state (character.s.monsterhunt) in localStorage. Merchant reads hunt state, evaluates viability using basic DPS/TTK heuristics (assume level 20+ monsters for hunt targets). If viable, merchant sends CM to update hunter targets. Hunters attempt all viable hunts within the ~30 min timer. If a hunt is beyond party scope with basic attacks, party waits for timer to expire (no penalty, lost opportunity only) then seeks new hunt. Turn in at NPC for monster tokens.
- **End-state**: Smart hunt management — evaluate multiple available hunts, pick most efficient for current party, track hunt cooldown (30 min), rotate through hunts as cooldowns expire. Coordinate hunt targets across all characters (active/inactive).
- **Notes**: 
  - `interact("monsterhunt")` requires being near the monsterhunt NPC
  - All party members can accept a hunt independently — each gets their own unique hunt assignment with its own status indicator
  - Hunts are typically unique even when all characters interact simultaneously
  - Reward is monster tokens (1 normal, 100 hardcore). Cooldown is ~30 minutes between hunts
  - Hunts tend to target high-level packs — game mechanic to keep monster populations in check
  - Hunt evaluation flow: hunters store hunt in localStorage → merchant evaluates via heuristics → merchant responds via CM with target update
  - Typically only 1 hunt completable within the timer window

## Farm Target Resolution

- **What**: Convert monster type name to physical map coordinates for travel
- **MVP**: Scans G.maps for matching monster pack, returns center of first spawn boundary.
- **End-state**: Better location selection — pick the spawn closest to party, or the spawn with the most favorable boundary (large area = less competition, small = tighter farming). Consider multiple spawns of same monster type across different maps.
- **Notes**: Currently implemented in objective.js findMonsterLocation(). Only returns first matching pack.
- **Notes (additional)**: For MVP, search maps in order: mainland, mansion, spooky forest. Return first matching pack found.

## Dynamic Target Selection

- **What**: Automatically select farm target based on party capability and efficiency
- **MVP**: Farm target is set by merchant via localStorage (or manual config). No automatic selection.
- **End-state**: Evaluate available monsters from G.monsters against party stats. Score by: XP/hour potential (XP * estimated kill rate), gold/hour (drops + gold), danger level (can party survive?). Factor in monster growth (higher-level packs = more XP but more dangerous). Select optimal target and publish to party.
- **Notes**: This is a complex optimization problem. hyper-fixate has viable_hunt() which is a simpler version. For MVP, manual target selection via config is sufficient.
- **Notes (additional)**: 
  - Kill rate estimation needs: party heuristics (estimated DPS, adjusted DPS), monster heuristics (projected health or live level data). Long-term farming can assume level 1 (so long as high-level packs can be quelled by party). Traveling to only farm leveled packs did not prove profitable.
  - Competition from other players: tough to account for, beyond MVP

## Objective Type Distinction

- **What**: Support different farming modes — XP farming, gold farming, material farming, token farming
- **MVP**: All farming is generic "farm" type. No mode distinction.
- **End-state**: Objective specifies farming mode which affects behavior. XP mode: target highest-XP monsters in party's capability range. Gold mode: target best gold-drop monsters. Material mode: target monsters that drop specific needed items. Token mode: prioritize monster hunt completion.
- **Notes**: This feeds into dynamic target selection. The distinction matters for long-term progression planning.
- **Notes (additional)**: This is a dynamic configuration for what to optimize against, not multiple modes. Most representative optimization targets: specific item drop (from monster type or pack on target map), gold, or XP/leveling.
