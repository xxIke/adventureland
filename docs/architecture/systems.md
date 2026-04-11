# Systems

Each system is an independent module that receives the shared context (`ctx`) and registers with the scheduler. This document defines each system's purpose, responsibilities, and boundaries.

## WorldModel

**Purpose**: Translate raw game state into a queryable, categorized local model.

**Responsibilities**: Poll game globals (`character`, `parent.entities`, `G`), categorize entities (party members, hostile monsters, hostile players, objective targets, special monsters, trade candidates), expose query helpers for other systems.

**Reads**: Game API globals directly.
**Writes**: `ctx.world` (sole writer).
**Events emitted**: Entity change signals when significant state changes occur (new hostile, party member down).
**Scheduling**: Moderate frequency (~250-500ms). Must run before systems that consume `ctx.world`.

**Requirements**: R5, R6

---

## Objective

**Purpose**: Decide what the bot should be doing and publish that decision as shared context.

**Responsibilities**: Maintain current high-level objective. Evaluate transitions between objectives. Publish objective context to `ctx.objective` so other systems (Movement, Targeting, Attack) can independently select their behavior. Track multi-step workflow progress for complex objectives. Read directives from localStorage/CM. Coordinate with merchant (system leader) for party-wide objectives.

Objective does NOT directly execute movement, attacks, or bank interactions. It publishes what to do; other systems decide how. For multi-step workflows (e.g., merchant restock), Objective tracks the current step and whether it has been accomplished — then advances to the next step. Movement handles getting to the right location. Utilities handle game interactions (bank, vendor, trade).

**Strategies**: Per-character-role. The objective system uses a role strategy that defines available objectives and transition logic:

- **Hunter strategy** — objectives: farm, travel, recover, follow, event, hunt. Evaluated each tick based on world state (are we at farm location? is HP critical? did leader request travel? is there a monster hunt to pursue?). Hunters also manage trade slots (listing needed items at 1g for passive resupply per R55) and store hunt state in localStorage for merchant evaluation (R37).
- **Merchant strategy** — objectives: idle, restock, upgrade, compound, sell, wander, deliver, hunt-eval, bank-ops, trade-fulfill. Multi-step workflows tracked via step/stepComplete. Inventory management, trade evaluation, item cataloging, gear comparison, gold management, hunt evaluation, and NPC interactions use shared utility functions. Merchant is the system leader: drives gear progression, evaluates hunt viability, manages gold baseline (R54), fulfills own characters' trade-slot requests opportunistically (R55), and delivers gear improvements during resupply (R56). Bank operations (R58) are foundational workflow steps reused across restock/upgrade/compound objectives.

Both follow the same pattern: evaluate state -> decide if transition needed -> update `ctx.objective`. This mirrors v2 where both Hunter and Merchant used identical state machine patterns with different state sets.

**`ctx.objective` shape**:
```
ctx.objective = {
  type: string,       // 'farm' | 'travel' | 'recover' | 'idle' | 'follow' | 'event' | 'hunt' | 'restock' | 'upgrade' | 'compound' | 'sell' | 'wander' | 'deliver' | 'hunt-eval' | 'bank-ops' | 'trade-fulfill'
  target: any,        // objective-specific: farm target type, travel destination, etc.
  location: object,   // where this objective takes place (if relevant)
  step: string,       // current step within multi-step workflows (null for simple objectives)
  stepComplete: bool,  // has the current step been accomplished?
  role: string,       // 'hunter' or 'merchant'
  lastUpdated: number,
}
```

**How other systems consume `ctx.objective`**:
- **Movement**: reads `type` to determine mode — `'farm'` at location = idle/combat mode; `'farm'` not at location = travel mode; `'travel'` = travel mode; `'restock'` step requires travel = travel mode
- **Targeting**: reads `type` to adjust behavior — `'farm'` = full priority chain; `'travel'` = melee defensive only, ranged defensive + opportunistic; `'recover'` = no targeting
- **Attack**: does NOT read `ctx.objective` — Attack executes whatever target the Targeting system provides. Objective-awareness is Targeting's responsibility.

**Reads**: `ctx.world`, `ctx.config`, localStorage (farm target, merchant inventory, supply wishlists, party coordination).
**Writes**: `ctx.objective` (sole writer), localStorage (merchant status, inventory snapshots).
**Events emitted**: `objective:changed` when objective type transitions (for logging).
**Events consumed**: CM messages (party directives, coordination), party status updates.
**Scheduling**: Low-moderate frequency (~1-2s). Decisions don't need sub-second timing.

**Requirements**: R3, R15, R16, R21–R31, R35, R37, R51–R58

**Structural note**: Merchant-specific workflows (R52-R58) are routed through the Objective system's merchant strategy using utility functions. This preserves the "Objective decides, utilities execute" pattern. If merchant strategy complexity grows unwieldy, extraction of a dedicated Merchant Operations system is a documented revisit point.

---

## Targeting

**Purpose**: Monitor WorldModel entity lists and maintain the current priority target for attack/heal and repositioning.

**Responsibilities**: Evaluate entity categories from WorldModel against priority rules. Maintain target stickiness (don't switch if current target is still valid in a qualifying tier). Coordinate with party to deduplicate targets across characters. Distinguish attack targets from heal targets via composable strategy types. Publish current target to shared context so all consumers (attack, movement, logging) read the same target on the same tick.

**Reads**: `ctx.world` (entity lists), `ctx.config` (toggles, roster), party target state (localStorage/CM).
**Writes**: `ctx.targeting` (current attack target, heal target, targeting state).
**Events emitted**: `targeting:changed` when target changes.
**Events consumed**: None — reads `ctx.objective` directly for objective-awareness.
**Scheduling**: Moderate-high frequency (~250ms). Must run after WorldModel.
**Strategies**: Three combat pattern types — melee, ranged, heal — composable per character. Classes select from these patterns at boot (e.g., priest uses [heal, ranged]). Heal takes priority when a party member qualifies; otherwise falls through to attack strategy. Per-situation modifiers (farm, travel, defensive) are within each strategy.

**Requirements**: R11, R12, R14

---

## Attack

**Purpose**: Execute `attack()` or `heal()` against the targeting system's current target.

**Responsibilities**: Read current target from `ctx.targeting`. Call `attack(target)` or `heal(target)` as appropriate. Gate on `can_attack()` and cooldown state. Dynamic scheduling — schedule next tick at cooldown expiry when on cooldown; short interval when idle.

**Reads**: `ctx.targeting` (current target), game globals (`character`, `can_attack()`).
**Writes**: None to shared state.
**Events emitted**: None.
**Events consumed**: None — reads targeting state directly.
**Scheduling**: Dynamic — cooldown-gated. Not applicable to merchant characters.

**Requirements**: R12

---

## Combat Skills

**Purpose**: Use class-specific combat skills on their own cooldown cadences.

**Responsibilities**: Evaluate when to use class skills (e.g., warrior charge, mage burst, ranger multi-shot). Check per-skill cooldowns via `is_on_cooldown()` or `parent.next_skill`. Execute skills against the targeting system's current target.

**Reads**: `ctx.targeting` (current target), game globals (`character`, skill cooldowns).
**Writes**: None to shared state.
**Events consumed**: None — reads targeting state directly.
**Scheduling**: Per-class cadence (~500-1000ms). Independent from attack cooldown. Not applicable to merchant characters.
**Strategies**: Per-class skill sets.

**Requirements**: R40, R41

---

## Merchant Skills

**Purpose**: Run merchant-specific skill loop (mluck, buff, bless for nearby characters) and emergency self-defense.

**Responsibilities**: Identify nearby characters eligible for buffs/blessings. Execute merchant skills on their own cooldown cadences. Different pattern and frequency from combat skills. Emergency `scare` for crowd control when `character.targets > 0` and HP is declining.

**Reads**: `ctx.world` (nearby characters), game globals (skill cooldowns).
**Writes**: None to shared state.
**Scheduling**: Moderate frequency (~1-2s). Only active on merchant characters.

**Requirements**: R12 (merchant-specific)

---

## Movement

**Purpose**: Handle all character movement — travel, repositioning, kiting, fleeing.

**Responsibilities**: Long-distance travel via strategy-encapsulated implementation (smart_move initially, custom pathfinding future). Combat repositioning — melee: approach to `character.range * 0.8` and hold ground; ranged/heal: maintain `character.range * 0.9` distance to target. Reactive kiting when a non-tank character is being targeted by a hostile. All combat movement validated with `can_move_to()` — iterate for alternatives when blocked. Flee behavior when under attack at critical HP — prefer party direction, `use("town")` as emergency escape. Party travel synchronization — match speed to slowest present party member via `cruise()`, read `ctx.party.travelSync` for coordinated travel (R51). Merchant stand management — close stand before ALL movement (including short NPC repositioning), reopen stand after movement completes at destination (R52).

**External/internal separation**: The movement contract has a stable external interface (modes, ctx reads, public methods) and an internal strategy layer that encapsulates implementation. Other systems depend only on the external interface. Internal travel implementation (smart_move vs custom pathfinding) is strategy-encapsulated and subject to iteration without contract changes.

**Mode selection**: Movement determines its mode each tick by reading `ctx.objective`, `ctx.targeting`, and character state:
- `flee` — `character.targets > 0` and HP critically low. Inviolable.
- `combat` — `ctx.targeting` has a target. Reposition to maintain effective range. Melee: approach + hold. Ranged/heal: maintain distance. Kite reactively if non-tank under threat.
- `travel` — `ctx.objective` requires being at a different location (farm target not at current map, merchant needs to go to bank, etc.).
- `idle` — at the right location, no target, nothing to do.

Movement does not need to be told what mode to be in — it reads the current state and selects the appropriate mode. This eliminates the need for `movement:request` events from other systems.

**Reads**: `ctx.objective` (what to do and where), `ctx.targeting` (current target for repositioning), `ctx.world` (entity positions, hostiles for flee, partyMembers for directional flee/kite), `ctx.party` (tank identity for kite decisions, travelSync for speed matching), `ctx.config`.
**Writes**: None to shared state.
**Events consumed**: None — reads shared context directly.
**Scheduling**: High frequency (~100-250ms) when actively repositioning or fleeing, low frequency when traveling or idle.
**Strategies**: Smart-move wrapper (Phase 2), custom pathfinding (future). Strategy swap does not affect external contract.
**Utilities**: Location service (`src/location.js`) resolves named destinations to coordinates — consumed by Objective to set `ctx.objective.location`, not by Movement directly.

**Requirements**: R9, R10, R12, R33, R34, R51, R52

---

## Party

**Purpose**: Maintain party membership and provide the plumbing for cross-character coordination.

**Responsibilities**:
- **Party assembly**: Detect missing members, send invites, accept invites from own characters and friends. Party membership is a game mechanic — if a character is online, it should be in the party.
- **Status publishing**: Periodic snapshots to localStorage (character state, HP%, current objective, position, inventory summary).
- **CM message handling**: Send and receive typed code messages. Route incoming CMs to appropriate consumers. Provide `sendMessage(target, type, data)` utility for other systems.
- **Travel coordination**: Synchronize movement speed to slowest party member during group travel. Publish party travel state (checkpoint-based) for Movement system to consume.

Party does NOT make decisions about what to do — it handles the mechanical plumbing for coordination. Decision-making lives in Objective (merchant strategy coordinates, hunter strategies consume directives).

**Leadership model**:
- **Merchant** = system leader. Always-on, lowest combat overhead. Examines/calculates system objectives and publishes via localStorage/CM.
- **Tank** = combat leader. Natural choice for attack coordination (others wait for tank aggro on difficult targets).

**Multi-player coordination**: Party may include characters from friends/other players. Current implementation handles own characters + friends. Inter-player coordination via merchant as consistent interface. Full multi-player coordination is a later stage — plumbing for it now via typed CM protocol and acceptance of external party members.

**Note on healing and hostile detection**: Players healing you set `entity.target` to your name, which can false-flag PvP hostile detection. WorldModel and Targeting must account for this — party members and friendly healers should never be classified as hostile. See [game-api.md](../game-api.md).

**Reads**: `ctx.world` (party members, nearby characters), `ctx.config` (roster, friends), `ctx.objective`, localStorage (party status).
**Writes**: `ctx.party` (tank identification), localStorage (party status snapshots, coordination data).
**Events emitted**: None — publishes via localStorage and CM, not internal events.
**Events consumed**: CM messages from other characters.
**Scheduling**: Low frequency (~2-5s). Party state doesn't change rapidly.

**Requirements**: R7, R8, R51

---

## Potion/Regen

**Purpose**: Manage HP/MP recovery through deliberate potion tier selection and regen skills.

**Responsibilities**: Evaluate HP and MP state. Determine combat context from game state signals (not from other bot systems). Select appropriate potion tier or regen action based on context. Prefer regen when not under pressure. Manage potion inventory slot positioning for correct tier consumption.

**Combat context detection**: Uses `character.targets > 0` (character is being targeted) and/or WorldModel hostile presence (`ctx.world.hostileMonsters`, `ctx.world.hostilePlayers`) — NOT `ctx.combat` or any combat system reference. This ensures the system works for all character types including merchant.

**Reads**: Game globals (`character` HP/MP/targets/items), `ctx.world` (hostile entity presence).
**Writes**: None to shared state.
**Scheduling**: Adaptive — schedule next tick at recovery cooldown expiry (`parent.next_skill.use_hp`). Applies to all character types including merchant.

**Requirements**: R13

---

## Logging

**Purpose**: Make the bot understandable and debuggable during development and unattended operation.

**Responsibilities**: Structured log collection from all systems. State and status snapshots. Runtime metrics. Debug surface for current objective and state. Periodic persistence of log snapshots.

**Reads**: `ctx.world`, all system states, scheduler instrumentation.
**Writes**: localStorage (log snapshots, status snapshots).
**Events consumed**: All significant events (for logging context).
**Scheduling**: Low frequency (~2-5s). Logging is not latency-sensitive.

**Requirements**: R17, R18, R44, R45

---

## Requirement Traceability Notes

**Satisfied by shared utility functions** (not a dedicated system — see `infrastructure.md`):
- R33 (Map POI) — NPC/location queries via G data lookups
- R34 (NPC Navigation) — Movement + utility functions for NPC location resolution

**Unassigned `should` priority** (not required for MVP):
- R36 (Pack/Zone reasoning)
- R38 (Server event response)

**Unassigned `later` priority** (deferred):
- R32, R39, R59, R60
