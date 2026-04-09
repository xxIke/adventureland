# Combat Skills Contract

## Identity

The Combat Skills system uses class-specific skills on their own cooldown cadences, independent from the attack/heal cooldown. It reads the current target from `ctx.targeting` and applies skills that enhance combat effectiveness.

**Scheduling**: Registered as `'combat-skills'` at ~500ms interval. Adaptive — returns longer delays when no target exists or all skills are on cooldown. Not applicable to merchant characters.

## Dependencies

- `ctx.targeting` — reads `attackTarget` for skill targeting
- `ctx.logger` — logs skill use and errors
- Game globals: `character`, `use_skill()`, `is_on_cooldown()`, `parent.next_skill`

**Does NOT read** `ctx.world` or `ctx.config` directly. Skill decisions are based on the current target and character state.

## Public Interface

### `createCombatSkills(ctx, strategy)`

Creates and returns a Combat Skills system instance.

**Parameters:**
- `ctx` (object) — shared context (must have `ctx.targeting` available)
- `strategy` (object) — skill strategy implementing the strategy interface

**Returns:** Object with:
- `tick()` — evaluation function registered with scheduler

### `combatSkills.tick()`

Main evaluation tick:

1. **Death check**: If `character.rip`, return `{ delay: 1000 }`.
2. **Target check**: Read `attackTarget` from `ctx.targeting`. If `null`, return `{ delay: 1000 }` (no target, no skills needed).
3. **Evaluate skills**: Call `strategy.useSkills(ctx)`. The strategy reads the current target from `ctx.targeting` and checks individual skill cooldowns.
4. **Adaptive delay**: Return `{ delay }` from strategy, or default `{ delay: 500 }`.

**Returns:** `{ delay }` for adaptive scheduling.

## Combat Skill Strategy Interface

A combat skill strategy is a plain object with these methods:

```
{
  name: string,
  useSkills(ctx) -> { delay: number } | void,
}
```

- `name` — string identifier for logging (e.g., `'warrior'`, `'mage'`, `'ranger'`)
- `useSkills(ctx)` — receive full shared context. Read current target from `ctx.targeting.attackTarget`. Check `is_on_cooldown(skill_name)` or `parent.next_skill[skill_name]` before each skill. May return `{ delay }` to indicate how long until the next skill could be available. Fire-and-forget `use_skill()` calls with `.catch()` for error logging.

### Strategy Information Requirements

Class skill strategies need access to:
- **Current target**: from `ctx.targeting.attackTarget` — skills target the current attack target
- **Cooldown state**: via `is_on_cooldown(skill_name)` or `parent.next_skill[skill_name]` timestamp
- **Skill catalog**: from `G.skills` — static skill definitions (cooldowns, ranges, costs, class restrictions)
- **Character equipment**: from `character.slots` — equipment may grant or modify available skills
- **Character class**: from `character.ctype` — determines base skill set

Strategies are responsible for managing their own skill priority ordering and cooldown sequencing. The system does not prescribe a particular skill rotation — strategies decide which skill to use when multiple are available.

### `createNoOpSkillStrategy()`

Phase 2 ships a no-op strategy. Class skill strategies are designed later with proper per-class contracts:

- `name`: `'none'`
- `useSkills()`: no-op, returns `{ delay: 2000 }`

Future skill strategies will be per-class (warrior, mage, priest, ranger, etc.) and may also account for equipment-granted skills. Each class strategy will need its own documented skill priority and cooldown management approach.

## Context Dependencies

```yaml
writes: nothing

reads:
  ctx.targeting:
    - attackTarget
```

## Behavior Contracts

### Invariants

1. Combat Skills never writes to `ctx.world` or `ctx.targeting`.
2. Combat Skills never calls `attack()`, `heal()`, `move()`, or potion functions.
3. Combat Skills only uses `use_skill()` for combat-related skills — not recovery skills (`use_hp`, `use_mp`, `regen_hp`, `regen_mp`).
4. Each skill has its own cooldown — the system may use multiple skills per tick if their cooldowns are independent.
5. The tick function never throws to the scheduler.

### Error Handling

1. If `use_skill()` throws or rejects, log the error and continue. Do not re-throw.
2. If `ctx.targeting` is not yet available, treat as no target.
3. The tick never throws to the scheduler.

## Event Contracts

### Events Emitted

None.

### Events Consumed

None. Reads `ctx.targeting` directly.

## Character Applicability

Combat Skills is only registered for hunter characters. Merchant characters use the separate Merchant Skills system.

## Requirements Traceability

| Requirement | How Satisfied |
|-------------|---------------|
| R40 (class skills) | Strategy `useSkills()` provides class-specific skill execution |
| R41 (enemy defense adaptation) | Strategy can check target properties before using skills |
| R42 (explicit responsibilities) | Uses combat skills only. Does not attack, heal, move, or use potions. |
| R44 (no silent failures) | All errors caught and logged |
