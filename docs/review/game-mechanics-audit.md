# Game Mechanics Audit

Comprehensive inventory of every game mechanic identifiable from the game API, server reference, v2 implementation (archive/v2), hyper-fixate implementation, and current requirements. Assesses v2 status, current implementation status, and requirement coverage for each.

Sources: `archive/v2` branch, `/home/tron/game_things/AdventureLand/hyper-fixate`, `docs/game-api.md`, game server reference (`/home/tron/game_things/AdventureLand/IkeBot/reference/`), `docs/requirements/`, current `src/`.

---

## Combat

| Mechanic | Description | v2 | hyper-fixate | Current | Requirements |
|----------|-------------|-----|-------------|---------|-------------|
| Basic attack | Select target, call `attack()`, respect cooldown | Working | Working | Working (attack.js) | R11 |
| Heal ally | Call `heal()` on party member missing HP | Working | Working | Working (attack.js + heal targeting strategy) | R12 |
| Target priority | Tiered selection: hostiles > farm targets > specials > easy | Working | Working | Working (targeting.js) | R11 |
| Target stickiness | Keep current target if still in valid tier | Working | Working | Working (targeting.js) | R11 |
| Party target dedup | Spread targets across party to avoid piling | Not implemented | Not implemented | Working (targeting.js nearestUnclaimed) | R11 |
| Looting chests | Pick up dropped loot after kills | Working (partial) | Working | Working (attack.js) | — |
| Class skills — ranger | huntersmark, poisonarrow, supershot | Not implemented | Working | Not implemented (no-op strategy) | R40 |
| Class skills — priest | curse, partyheal, absorb, revive | Not implemented | Partial | Not implemented | R40 |
| Class skills — paladin | mshield, selfheal, purify, smash | Not implemented | Working | Not implemented | R40 |
| Class skills — warrior | charge, cleave, stomp, taunt | Not implemented | Stubbed | Not implemented | R40 |
| Class skills — mage | burst, fireball, cburst, energize | Not implemented | Stubbed | Not implemented | R40 |
| Class skills — rogue | backstab, invis, shadowstrike | Not implemented | Stubbed | Not implemented | R40 |
| Class skills — merchant | scare (crowd control) | Not implemented | Working | Not implemented | R12 |
| Merchant skills — mluck/buff/bless | Buff nearby characters | Stubbed | Not found | Not implemented | R12 |
| Condition/debuff awareness | Read target.s for curse, immune, mshield | Not implemented | Working | Not implemented | R40, R41 |
| Enemy defense adaptation | Adjust targeting/skills based on armor, resistance, evasion | Not implemented | Not implemented | Not implemented | R41 |
| Aggro coordination | Tank holds aggro, others wait | Not implemented | Partial (tank election) | Partial (tank identification in party.js) | R12 |
| PvP hostile response | Detect hostile player aggression, switch posture | Partial (detection) | Referenced | Partial (detection + targeting tier) | R14 |
| Damage calculation heuristics | Estimate DPS/danger from G.monsters stats | Not implemented | Partial (party DPS/HPS calc) | Not implemented | R35 |

## Death & Recovery

| Mechanic | Description | v2 | hyper-fixate | Current | Requirements |
|----------|-------------|-----|-------------|---------|-------------|
| Death detection | Detect `character.rip` state | Working | Working | Working (all systems check) | R3 |
| Auto-respawn | Call `respawn()` after death with delay | Not explicit | Working (15s delay) | Not implemented | R3 |
| State recovery after respawn | Resume previous objective after respawn | Working (localStorage backup) | Working (backup/recover) | Not implemented | R3 |
| State persistence on disconnect | Save bot state to localStorage periodically | Working (30s interval) | Working | Partial (party status only) | R4 |
| State recovery after reload | Restore from localStorage on boot | Working | Working | Partial (config only) | R4 |

## Movement & Navigation

| Mechanic | Description | v2 | hyper-fixate | Current | Requirements |
|----------|-------------|-----|-------------|---------|-------------|
| Long-distance travel | `smart_move()` to map/coord destination | Working | Working | Working (movement.js travel mode) | R9 |
| Combat approach | Move toward target, stop at attack range | Working | Working | Working (movement.js approach) | R9, R10 |
| Kiting | Non-tank maintains distance from hostile while attacking | Working (partial, radial only) | Not explicit | Working (movement.js reactive kite) | R10, R12 |
| Flee | Move away from hostiles at low HP | Not explicit | Not explicit | Working (movement.js flee mode) | R10 |
| Hold ground | Melee stays in place after reaching target | Not explicit | Not explicit | Working (movement.js melee pattern) | R12 |
| Defined locations | Known coords for bank, NPCs, upgrade spot | Working (bank, upgrade NPC) | Working (vendor locations) | Not implemented | R33 |
| NPC navigation | Travel to specific NPC by name/role | Not explicit (hardcoded coords) | Working (find_purchase_vendor) | Not implemented | R34 |
| Map transition handling | Door/transporter usage for map changes | Implicit via smart_move | Implicit via smart_move | Implicit via smart_move | R34 |
| Travel retry with backoff | Retry failed smart_move with delay | Working (5s timeout) | Working | Working (3 retries, 2s backoff) | R9 |
| Party travel sync | Match speed to slowest member | Not implemented | Not implemented | Not implemented (contract exists) | R10 |

## Potion & Recovery

| Mechanic | Description | v2 | hyper-fixate | Current | Requirements |
|----------|-------------|-----|-------------|---------|-------------|
| HP potion tier selection | Select hpotx/hpot1/hpot0 by deficit | Working | Working | Working (potion-regen.js) | R13 |
| MP potion tier selection | Select mpotx/mpot1/mpot0 by deficit | Working | Working | Working (potion-regen.js) | R13 |
| Regen skill fallback | Use regen_hp/regen_mp when no potions | Working | Working | Working (potion-regen.js) | R13 |
| Potion slot management | Swap desired potion to last slot before use | Working | Working | Working (potion-regen.js) | R13 |
| Potion tier fallback | Fall through tiers when desired unavailable | Working | Working | Working (potion-regen.js) | R13 |
| Context-aware recovery | Regen when idle, potions under pressure | Not explicit | Working (priority system) | Working (underPressure check) | R13 |
| Adaptive cooldown scheduling | Schedule next tick at cooldown expiry | Not explicit | Not explicit | Working (cooldownDelay) | R13 |

## Party & Communication

| Mechanic | Description | v2 | hyper-fixate | Current | Requirements |
|----------|-------------|-----|-------------|---------|-------------|
| Party formation | Auto-invite/request party members | Working | Working | Working (party.js) | R7 |
| Party invite acceptance | Accept invites from known characters | Working | Working | Working (party.js on_party_invite) | R7 |
| CM message sending | Send typed messages between characters | Working (basic) | Working (structured) | Working (party.js sendMessage) | R8 |
| CM message routing | Route incoming CMs by type | Not structured | Working (event types) | Working (party.js handleCM) | R8 |
| Status publishing | Write character state to localStorage | Working (30s backup) | Working | Working (party.js 5s snapshots) | R8 |
| Tank identification | Determine party tank by survivability | Not implemented | Working (party stats calc) | Working (party.js max_hp+armor+resistance) | R12 |
| Config broadcast | Sync config across party via CM | Not implemented | Working (update_config) | Not implemented | R8 |
| Wishlist coordination | Hunters publish supply needs to merchant | Not implemented | Working (update_wishlist CM) | Not implemented | R25 |
| Emergency coordination | Flee/regroup signals | Not implemented | Not implemented | Contract exists (not implemented) | R8 |

## Objective & Strategy

| Mechanic | Description | v2 | hyper-fixate | Current | Requirements |
|----------|-------------|-----|-------------|---------|-------------|
| Farm objective | Set monster type + location, farm in loop | Working (state-driven) | Working | Working (objective.js farm type) | R15, R16 |
| Travel objective | Travel to distant location | Working | Working | Working (objective.js travel type) | R15 |
| Recover objective | Detect death/low HP, recover | Stubbed | Working | Working (objective.js recover type) | R3, R15 |
| Idle objective | Wait for directives | Working | Working | Working (objective.js idle type) | R15 |
| Follow objective | Follow party leader | Stubbed | Working | Not implemented (contract exists) | R16 |
| Event objective | Participate in server event | Stubbed | Stubbed | Not implemented | R38 |
| Monster hunt quest | Accept hunt, kill targets, turn in | Stubbed | Working (full lifecycle) | Not implemented | R37 |
| Farm target resolution | Look up monster spawn from G.maps | Working (hardcoded index) | Working | Working (objective.js findMonsterLocation) | R33 |
| Dynamic target selection | Select farm target by party capability | Not implemented | Partial (viable_hunt check) | Not implemented | R30 |
| Objective type distinction | Gold vs XP vs material farming modes | Not implemented | Not implemented | Not implemented | R31 |

## Merchant & Economy

| Mechanic | Description | v2 | hyper-fixate | Current | Requirements |
|----------|-------------|-----|-------------|---------|-------------|
| Inventory cataloging | Scan and classify all items | Working | Working | Not implemented | R21 |
| Junk classification | Identify items to sell/deposit | Working (nonJunkItems list) | Working | Not implemented | R21 |
| Bank deposit gold | Travel to bank, deposit gold | Working | Working | Not implemented | R24 |
| Bank store items | Store inventory items in vault | Working | Working | Not implemented | R24 |
| Bank retrieve items | Get specific items from vault | Working | Working | Not implemented | R24, R26 |
| NPC buy potions | Purchase potions from NPC vendor | Working | Working | Not implemented | R23, R24 |
| NPC sell items | Sell junk items to NPC vendor | Working | Working | Not implemented | R24 |
| Item upgrade workflow | Retrieve item + scroll, travel to NPC, execute upgrade | Working | Working | Not implemented | R26 |
| Item compound workflow | Retrieve 3 items + scroll, travel to NPC, execute compound | Working | Working | Not implemented | R26 |
| Scroll acquisition | Buy appropriate scroll grade for upgrade/compound | Working (buy) | Working | Not implemented | R26 |
| Item grade checking | Determine scroll grade needed via item_grade() | Working | Working | Not implemented | R26 |
| Upgrade cooldown handling | Wait for character.q.upgrade.ms | Working | Working | Not implemented | R26 |
| Merchant stand operation | open_stand()/close_stand() for player trading | Working | Working | Not implemented | R28 |
| Player trade evaluation | Assess nearby trades, buy/sell decisions | Working (value-based) | Working | Not implemented | R28 |
| Item transfer to player | send_item() + send_gold() for resupply | Working | Working | Not implemented | R24 |
| Field resupply workflow | Withdraw gold → buy potions → travel to hunters → deliver → collect junk → bank | Working (full cycle) | Working | Not implemented | R24 |
| Restock detection | Monitor hunter inventory via localStorage | Working | Working (wishlist CMs) | Not implemented | R23 |
| Merchant wandering | Travel route for selling/scouting | Working (partial) | Working | Not implemented | — |
| Hunt target management | Merchant sets farm target for hunters via localStorage | Working | Working | Not implemented | R30 |
| Equipment improvement planning | Evaluate which items to upgrade/compound | Working (basic) | Working (can_improve) | Not implemented | R22, R27 |

## World Knowledge & Game Data

| Mechanic | Description | v2 | hyper-fixate | Current | Requirements |
|----------|-------------|-----|-------------|---------|-------------|
| Entity classification | Categorize entities by type and threat | Working | Working (detailed) | Working (world-model.js) | R5, R6 |
| Monster spawn lookup | Find monster locations from G.maps | Working (hardcoded) | Working | Working (objective.js G.maps scan) | R33 |
| Monster danger assessment | Evaluate HP, attack, range for threat scoring | Partial (easy = hp < atk*0.8) | Partial (viable_hunt) | Partial (same easy heuristic) | R35 |
| Pack/zone reasoning | Reason about spawn boundaries, not just individuals | Not implemented | Partial (pack_targets) | Partial (boundary center calc) | R36 |
| NPC location database | Know where bank, vendor, upgrade NPCs are | Working (hardcoded coords) | Working (find functions) | Not implemented | R33 |
| Map PvP awareness | Check if current map is PvP zone | Not explicit | Referenced (in_pvp) | Not implemented | R14 |
| Monster growth model | Understand leveled monster stat scaling | Not implemented | Not implemented | Documented (game-api.md) | R35 |
| Friendly entity detection | Identify own characters, party members, friends | Working | Working | Working (world-model.js + party.js) | R5 |

## Crafting & Special Items

| Mechanic | Description | v2 | hyper-fixate | Current | Requirements |
|----------|-------------|-----|-------------|---------|-------------|
| Item crafting | Use craft() with recipe inputs | Not implemented | Not implemented | Not implemented | R32, R39 |
| Item exchange | Convert items via exchange NPC | Not implemented | Not implemented | Not implemented | R32, R39 |
| Token collection | Track monster tokens from hunts | Not implemented | Implicit (hunt rewards) | Not implemented | R32 |
| Recipe awareness | Know which items need crafting vs drops | Not implemented | Not implemented | Not implemented | R39 |
| Shell economy | Track/use premium currency | Not implemented | Not implemented | Not implemented | — |

> **Correction**: "Item dismantle" removed — no known dismantle mechanic exists in Adventure Land.

## Gathering

| Mechanic | Description | v2 | hyper-fixate | Current | Requirements |
|----------|-------------|-----|-------------|---------|-------------|
| Fishing | Travel to fishing zone, use fishing skill | Not implemented | Not implemented | Not implemented | — |
| Mining | Travel to mining zone, use mining skill | Not implemented | Not implemented | Not implemented | — |

## Events & Quests

| Mechanic | Description | v2 | hyper-fixate | Current | Requirements |
|----------|-------------|-----|-------------|---------|-------------|
| Server event detection | Detect active server events | Not implemented | Stubbed | Not implemented | R38 |
| Event participation | Travel to event, engage in event objectives | Not implemented | Stubbed | Not implemented | R38 |
| Monster hunt — accept | Interact with NPC to get hunt quest | Stubbed | Working | Not implemented | R37 |
| Monster hunt — track | Monitor kill count via character.s.monsterhunt | Not implemented | Working | Not implemented | R37 |
| Monster hunt — turn in | Return to NPC after completing hunt | Not implemented | Working | Not implemented | R37 |
| Monster hunt — viable check | Assess if party can handle hunt target | Not implemented | Working (viable_hunt) | Not implemented | R37 |
> **Correction**: Daily tasks and achievement tracking removed — no known distinct mechanics for these beyond server events and tracker device (see Social & Advanced).

## Infrastructure & Lifecycle

| Mechanic | Description | v2 | hyper-fixate | Current | Requirements |
|----------|-------------|-----|-------------|---------|-------------|
| Single entry point bootstrap | Deterministic initialization order | Working (class constructors) | Working (load_code chain) | Working (boot.js) | R1 |
| Scheduler with named loops | All timers owned, cancelable, named | Working (handler timeouts) | Working (handler intervals) | Working (scheduler.js) | R2, R47 |
| Adaptive tick scheduling | Systems return { delay } for dynamic intervals | Not explicit | Not explicit | Working (scheduler.js) | R2 |
| Structured logging | Log with system, level, context | Working (Logger class, 5 levels) | Working | Working (logging.js) | R17 |
| Status inspection | Expose current state for debugging | Partial (showLog) | Partial | Partial (getState methods, window.__bot) | R18 |
| Centralized config | Single config source for all systems | Working (botConfig) | Working | Working (configuration.js) | R19, R48 |
| Build pipeline | Bundle source into single deployable | Not explicit (load_code) | load_code chain | Working (esbuild) | R43, R50 |
| Event bus for diagnostics | Pub/sub for logging signals | Not implemented | Not implemented | Working (event-bus.js) | R17 |
| localStorage schema | Documented key ownership and shapes | Partial (keys defined) | Partial | Working (al_bot: prefix convention) | R46 |

## Social & Advanced

| Mechanic | Description | v2 | hyper-fixate | Current | Requirements |
|----------|-------------|-----|-------------|---------|-------------|
| Friends system | Track and interact with friends list | Referenced (isFriendly) | Referenced | Partial (config.friendlyPlayers) | — |
| Tracker / passive buffs | Track monster kills for persistent buffs | Not implemented | Not implemented | Not implemented | — |
| Tavern/gambling | Tavern games and betting | Not implemented | Not implemented | Not implemented | — |
| Magiport/teleport | Mage teleport abilities | Not implemented | Not implemented | Not implemented | — |

> **Correction**: Duel system, pet system, and guild system removed — no known mechanics for these exist in Adventure Land. Achievement tracking removed — the tracker device for kill tracking/passive buffs is captured above.

---

## Summary Counts

| Category | Total Mechanics | v2 Working | hyper-fixate Working | Current Working | Not Implemented Anywhere |
|----------|----------------|------------|---------------------|-----------------|------------------------|
| Combat | 18 | 4 | 9 | 7 | 3 |
| Death & Recovery | 5 | 3 | 5 | 1 | 2 |
| Movement | 10 | 5 | 5 | 7 | 2 |
| Potion/Recovery | 7 | 5 | 7 | 7 | 0 |
| Party/Communication | 9 | 3 | 6 | 6 | 2 |
| Objective/Strategy | 10 | 3 | 5 | 4 | 3 |
| Merchant/Economy | 18 | 14 | 14 | 0 | 0 |
| World Knowledge | 8 | 3 | 4 | 4 | 1 |
| Crafting/Special | 5 | 0 | 0 | 0 | 3 |
| Gathering | 2 | 0 | 0 | 0 | 2 |
| Events/Quests | 5 | 0 | 3 | 0 | 1 |
| Infrastructure | 9 | 6 | 6 | 9 | 0 |
| Social/Advanced | 4 | 0 | 0 | 0 | 3 |

**Totals**: 109 mechanics identified (6 removed as non-existent: item dismantle, duel system, pet system, guild system, achievement tracking, daily tasks). Current implementation covers ~38. v2 covered ~46. hyper-fixate covered ~64.

## Key Gaps for MVB (v2 baseline)

These mechanics were working in v2 but are missing from current implementation:

1. **Auto-respawn** — `respawn()` call after death
2. **State persistence/recovery** — Full bot state backup to localStorage, restore on reload
3. **Defined NPC locations** — Bank coords, upgrade NPC coords, vendor coords
4. **NPC navigation** — Travel to specific NPCs for banking, buying, upgrading
5. **Banking operations** — Deposit gold, store items, retrieve items
6. **NPC buying** — Purchase potions and scrolls from vendors
7. **NPC selling** — Sell junk items to vendors
8. **Item transfer** — send_item() and send_gold() between characters
9. **Inventory cataloging** — Scan and classify all held/banked items
10. **Junk classification** — Identify what to sell/deposit vs keep
11. **Item upgrade workflow** — Full upgrade cycle with scroll, NPC, cooldown
12. **Item compound workflow** — Full compound cycle
13. **Merchant stand** — open_stand()/close_stand()
14. **Player trade evaluation** — Assess and accept/reject trades
15. **Field resupply workflow** — Complete merchant supply run cycle
16. **Restock detection** — Monitor hunter potion/inventory levels
17. **Hunt target management** — Merchant sets farm target for party

## Key Gaps Beyond v2 (hyper-fixate additions)

These mechanics were working in hyper-fixate but not in v2 or current:

1. **Class-specific combat skills** — Ranger, priest, paladin skill usage
2. **Condition/debuff awareness** — Read and react to buff/debuff states
3. **Monster hunt quest lifecycle** — Accept, track, turn in hunts
4. **Priority-based potion system** — Context-aware potion priority
5. **Structured inter-character messaging** — Typed event system for coordination
6. **Wishlist coordination** — Hunters publish needs, merchant fulfills
7. **Equipment improvement planning** — Evaluate upgrade viability

## Requirements Not Covered by Any Mechanic

These requirements have no implementation in v2, hyper-fixate, or current:

- R27 — Expected value improvement planning (configurable upgrade viability rules)
- R29 — Standard offers and opportunistic purchases
- R31 — Objective type distinction (gold vs XP vs material modes)
- R32 — Token/recipe/special-item progression
- R36 — Pack/zone-level reasoning (beyond center-of-boundary)
- R39 — Recipe and exchange awareness
- R49 — Testable core logic (pure function separation)
