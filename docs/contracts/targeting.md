---
system: Targeting
writes:
  ctx.targeting:
    - attackTarget: Entity | null
    - healTarget: Entity | null
    - lastUpdated: number
reads:
  ctx.world:
    - hostilePlayers
    - hostileMonsters
    - targetMonsters
    - specialMonsters
    - easyMonsters
    - partyMembers
  ctx.objective:
    - type
  ctx.config:
    - farmTarget
    - toggles.pvpDefense
game_globals:
  - character
  - distance()
external: []
---

# Targeting Contract

## Identity

The Targeting system monitors WorldModel entity lists and maintains the current priority target for attack, heal, and repositioning. It is the single source of truth for "what should I act on?" — all consumers (Attack, Combat Skills, Movement) read from `ctx.targeting` rather than independently selecting targets.

**Scheduling**: Registered as `'targeting'` at ~250ms interval. Must run after WorldModel. Not adaptive — consistent evaluation frequency ensures all consumers see fresh targeting state.

## Dependencies

- `ctx.world` — reads entity lists for target evaluation
- `ctx.objective` — reads current objective type to adjust targeting behavior (e.g., no offensive targeting during travel)
- `ctx.config` — reads `farmTarget`, `toggles.pvpDefense`
- `ctx.bus` — emits `targeting:changed`
- `ctx.logger` — logs targeting decisions
- Game globals: `character`, `distance()`

## Public Interface

### `createTargeting(ctx, strategies)`

Creates and returns a Targeting system instance. The returned object is placed on `ctx.targeting` by boot.js so all consumers read the same target.

**Parameters:**
- `ctx` (object) — shared context
- `strategies` (array) — ordered list of targeting strategies implementing the strategy interface. Evaluated in order; first strategy returning a non-null target wins. For classes with heal + attack, heal strategy comes first.

**Returns:** Object with:
- `tick()` — evaluation function registered with scheduler
- `getAttackTarget()` — returns current attack target entity, or `null`
- `getHealTarget()` — returns current heal target entity, or `null`. Non-null only for characters with `character.heal > 0` and an active heal strategy.
- `getState()` — returns `{ attackTarget, healTarget, state, strategyName }` for diagnostics

### `targeting.tick()`

Main evaluation tick. Executes the following sequence:

1. **Death check**: If `character.rip`, clear all targets, return.
2. **Validate current targets**: If attack target is dead (`target.dead` or `target.rip`), not visible, or not in `parent.entities`, clear it with reason `'died'` or `'lost'`. Same for heal target.
3. **Evaluate targets**: Iterate `strategies` array in order. For each strategy, call `strategy.evaluate(ctx, currentState)`. If a strategy returns a non-null `healTarget`, stop iteration — heal target wins. If a strategy returns null for both targets, continue to the next strategy. The first strategy returning a non-null `attackTarget` wins. If all strategies return null, clear all targets.
4. **Apply stickiness**: If the strategy returns the same target as current, no change. If different, emit `targeting:changed` with reason `'selected'` or `'priority'`.
5. **Update `ctx.targeting`**: Write attack target, heal target, and `lastUpdated` timestamp.

**Returns:** void (not adaptive).

### `targeting.getAttackTarget()`

**Returns:** The current attack target entity reference, or `null`.

### `targeting.getHealTarget()`

**Returns:** The current heal target entity reference, or `null`. Non-null only when the active targeting strategy includes heal capability and a party member qualifies for healing.

### `targeting.getState()`

**Returns:** `{ attackTarget: Entity|null, healTarget: Entity|null, state: string, strategyName: string }`
- `state` is one of: `'idle'` (no targets), `'targeting'` (has target)

## Targeting State Shape (`ctx.targeting`)

After each tick, `ctx.targeting` is populated with:

```
ctx.targeting = {
  attackTarget: Entity | null,
  healTarget: Entity | null,
  lastUpdated: number,
}
```

## Target Selection Priority

The default priority chain for attack targets (R11):

1. **Hostile players** (if `ctx.config.toggles.pvpDefense`): `ctx.world.hostilePlayers`, nearest first (R14)
2. **Hostile monsters**: `ctx.world.hostileMonsters`, nearest first
3. **Target monsters**: `ctx.world.targetMonsters` (matching `ctx.config.farmTarget`), nearest first
4. **Special monsters**: `ctx.world.specialMonsters`, nearest first
5. **Easy monsters**: `ctx.world.easyMonsters`, nearest first

Within each tier, prefer the nearest entity (by `distance(character, entity)`). Return `null` if all lists are empty.

### Target Stickiness

If the current attack target is still alive and present in any qualifying tier, **keep it**. Only switch targets when:
- Current target is dead, invisible, or no longer in `parent.entities`
- A **higher-priority tier** activates (e.g., hostile player appears while farming target monsters)
- Current target is no longer in any qualifying tier

This prevents target flapping between equidistant entities. The strategy receives the current target state so it can implement this check.

### Heal Target Selection

Heal target evaluation is performed by the heal targeting strategy (see Strategy Types below). It is gated on `character.heal > 0` — a capability check, not a class check. Any character with heal capability can use a heal strategy.

**Qualification criteria**: A party member qualifies for healing when:
- `member.max_hp - member.hp >= character.heal * 0.8` (heal recovers at least 80% of its potential), OR
- `member.hp < member.max_hp * 0.75` (member is missing more than 25% of their max HP — accounts for high-level healers assisting low-level characters)

**Selection**: Among qualifying members, prefer the one missing the most HP.

**Priority**: When a character has both heal and attack strategies, heal takes priority. If a heal target is selected, `healTarget` is set and the Attack system calls `heal()` instead of `attack()`. If no party member qualifies, the character falls through to its attack strategy (melee or ranged).

### Party Target Deduplication

When selecting from `targetMonsters` or `easyMonsters` (tiers where targets are plentiful and individually weak):

1. Check if another party member already has the candidate targeted (via `entity.targets > 0` or cross-character target state from localStorage/CM).
2. If so, prefer a different entity in the same tier.
3. Only target an already-claimed entity if no unclaimed alternatives exist in the tier.

This prevents multiple party members from piling onto the same easy target while others go unfought — a problem observed in v2 where ranged units killed melee's targets before melee arrived.

### Hunt Target Awareness (R37)

During an active monster hunt (`ctx.objective.type === 'hunt'`), the hunt target monster type is handled by the objective system setting `farmTarget` to the hunt monster type. This causes `targetMonsters` in WorldModel to automatically include hunt targets — no targeting system changes needed. When the hunt completes or expires, objective restores the original farm target.

### Aggro Coordination

For high-HP targets (future: configurable threshold), non-tank characters should wait to attack until the tank has aggro:

- If `entity.target !== tankName`, non-tank characters set `attackTarget` but the Attack system should defer execution until aggro is confirmed.
- This is a targeting policy — the targeting system provides the information, and the Attack system reads a flag or checks the condition.
- Hunt targets (R37) are particularly relevant for aggro coordination since they tend to be high-level monsters where squishy characters pulling aggro is dangerous.

**Note**: Aggro coordination is a Phase 3+ concern (requires party awareness). Phase 2 targets do not need it.

## Targeting Strategy Interface

A targeting strategy is a plain object with these methods:

```
{
  name: string,
  evaluate(ctx, currentState) -> { attackTarget, healTarget },
}
```

- `name` — string identifier for logging (e.g., `'melee'`, `'ranged'`, `'heal'`)
- `evaluate(ctx, currentState)` — given the full shared context and the current targeting state (including current attack/heal targets for stickiness), return the desired targets. Returns `{ attackTarget: Entity|null, healTarget: Entity|null }`.

The strategy receives the full `ctx` so it can read `ctx.world`, `ctx.objective`, `ctx.config`, and any future context additions without requiring interface changes. The strategy is responsible for implementing objective-aware targeting (e.g., full chain during farm, defensive during travel).

`currentState` shape: `{ attackTarget: Entity|null, healTarget: Entity|null }`

## Strategy Types

There are three targeting strategy types representing distinct combat patterns:

| Strategy | Purpose | Movement implication |
|----------|---------|---------------------|
| **Melee** | Close-range attack targeting | Approach target, hold ground |
| **Ranged** | Ranged attack targeting | Maintain `character.range` distance from target |
| **Heal** | Heal party members | Maintain `character.range` distance from heal target |

These are independent patterns. A character class may have access to **multiple strategies** — for example, a priest has both ranged and heal. When multiple strategies are available, **heal takes priority**: if a party member qualifies for healing, the heal strategy is used; otherwise the character's attack strategy (melee or ranged) is used. Only one target can be acted on per attack/heal cooldown cycle.

Most classes will use a single attack strategy (melee or ranged). The architecture supports composition so that heal capability can be layered onto any attack pattern without modifying the attack strategy itself.

### Strategy Composition

`createTargeting(ctx, strategies)` accepts an ordered list of strategies. The targeting system evaluates them in priority order (heal first if present, then the attack strategy). The first strategy that returns a non-null target wins for that cycle. This keeps each strategy focused on its own concern.

**Class-to-strategy mapping** (at boot):

| Pattern | Strategies | Example classes |
|---------|-----------|----------------|
| Melee only | `[melee]` | Warrior, Rogue |
| Ranged only | `[ranged]` | Mage, Ranger |
| Ranged + Heal | `[heal, ranged]` | Priest |

Boot.js resolves the strategy list based on character capabilities (`character.heal > 0` adds heal, `character.range` threshold distinguishes melee vs ranged). The mapping is configuration, not hardcoded class checks.

### `createMeleeTargetingStrategy()`

Melee attack targeting strategy:

- `name`: `'melee'`
- `evaluate(ctx, currentState)`:
  - Reads `ctx.objective.type` to determine targeting mode
  - During `'farm'`: full priority chain, nearest within tier
  - During `'travel'`: hostiles attacking party only (melee cannot pick off targets during travel without stopping)
  - During `'recover'`/`'idle'`: defensive only (hostiles targeting party)
  - Always returns `healTarget: null`
  - Implements target stickiness: if `currentState.attackTarget` is still present in a qualifying tier, returns it unchanged
  - Otherwise selects nearest in the highest active priority tier
  - Implements party target deduplication for target/easy monster tiers

### `createRangedTargetingStrategy()`

Ranged attack targeting strategy:

- `name`: `'ranged'`
- `evaluate(ctx, currentState)`:
  - Same priority chain as melee (hostile players > hostile monsters > target monsters > special > easy)
  - Same objective-aware modes as melee, except:
    - During `'travel'`: hostiles attacking party + easy monsters in immediate range (ranged can pick off weak targets during travel without stopping)
  - Always returns `healTarget: null`
  - Implements target stickiness and party target deduplication identically to melee

The ranged and melee strategies share the same priority chain and most logic. They are separate strategies to allow independent iteration — ranged targeting may diverge as the system matures (e.g., preferring targets that are already at range, avoiding pulling new groups).

### `createHealTargetingStrategy()`

Heal targeting strategy:

- `name`: `'heal'`
- **Precondition**: Only usable by characters with `character.heal > 0`
- `evaluate(ctx, currentState)`:
  - Scans `ctx.world.partyMembers` for members qualifying for healing (see Heal Target Selection above)
  - If a member qualifies: returns `{ attackTarget: null, healTarget: member }`
  - If no member qualifies: returns `{ attackTarget: null, healTarget: null }` — the targeting system falls through to the next strategy in the composition chain
  - Implements heal target stickiness: if `currentState.healTarget` still qualifies, prefer it
  - During `'recover'`/`'idle'`: still evaluates heal targets (healing allies while recovering is valid)

## Context Dependencies

```yaml
writes:
  ctx.targeting:
    attackTarget: Entity | null
    healTarget: Entity | null
    lastUpdated: number

reads:
  ctx.world:
    - hostilePlayers
    - hostileMonsters
    - targetMonsters
    - specialMonsters
    - easyMonsters
    - partyMembers         # heal strategy scans for heal targets
  ctx.objective:
    - type                # determines targeting mode (farm/travel/defensive)
  ctx.config:
    - farmTarget
    - toggles.pvpDefense
```

## Behavior Contracts

### Invariants

1. Targeting never writes to `ctx.world`.
2. Targeting never calls `attack()`, `heal()`, `move()`, or any action function.
3. Targeting holds at most one attack target and one heal target at a time.
4. A dead, invisible, or missing target is cleared before evaluating new targets.
5. The tick function never throws to the scheduler — all errors are caught and logged.
6. `ctx.targeting` is updated every tick, even if targets haven't changed (`lastUpdated` is always fresh).

### Error Handling

1. If a strategy's `evaluate()` throws, log the error and skip to the next strategy. If all strategies throw, clear all targets.
2. Individual entity access errors are caught — a bad entity reference does not prevent evaluation.
3. The tick never throws to the scheduler.

## Event Contracts

### Events Emitted

| Event | Payload | When |
|-------|---------|------|
| `targeting:changed` | `{ previous: Entity\|null, current: Entity\|null, type: 'attack'\|'heal', reason: string }` | Target changes |

**`reason` values**:
- `'selected'` — new target selected from world state
- `'died'` — target died
- `'lost'` — target went invisible or left entities
- `'priority'` — higher-priority target appeared
- `'cleared'` — no targets remain
- `'healed'` — heal target no longer needs healing

### Events Consumed

None. Targeting reads `ctx.objective` directly to adjust behavior.

### Objective-Aware Targeting

Targeting adjusts its behavior based on `ctx.objective.type`:

| Objective Type | Targeting Behavior |
|---------------|-------------------|
| `'farm'` | Full priority chain (hostile > target > special > easy) |
| `'travel'` | Strategy-dependent: melee = hostiles only; ranged = hostiles + easy in immediate range |
| `'recover'` | No targeting — character is dead or recovering |
| `'idle'` | Defensive only (hostiles targeting party) |
| `'restock'`, `'upgrade'`, etc. | Defensive only (merchant workflow steps) |

## Requirements Traceability

| Requirement | How Satisfied |
|-------------|---------------|
| R11 (priority targeting) | Priority chain in strategy `evaluate()` |
| R12 (class-aware combat) | Melee/ranged/heal as composable strategy types; classes select pattern at boot |
| R14 (hostile player response) | Hostile players highest priority when `pvpDefense` enabled |
| R42 (explicit responsibilities) | Targeting selects. Does not attack, heal, move, or use potions. |
| R44 (no silent failures) | All errors caught and logged |
