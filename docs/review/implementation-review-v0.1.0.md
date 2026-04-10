# Implementation Review — v0.1.0

**Date**: 2026-04-10
**Scope**: Full implementation review of all src/*.js against documented contracts, intent, requirements, architecture, and game API reference
**Branch**: v0.1.0
**Reviewer**: Claude (implementation-review skill)

## Summary

Implementation covers Phases 0-3 (infrastructure, core systems, combat decomposition, objective/party). Code is well-structured with clean separation of concerns, consistent factory-function patterns, and proper strategy composition. However, the review identified **5 blockers**, **9 warnings**, and **4 suggestions** that need resolution before this can serve as a reliable MVP baseline.

The most critical findings center on: an async race condition in potion recovery, missing death respawn logic, a likely hallucinated game data reference, duplicated friendly-entity logic across three files, and an unverified party acceptance API call.

---

## Findings

### Blockers

#### B1: Potion-regen async race condition

**Files**: `src/potion-regen.js:122-129`
**Contract**: `docs/contracts/potion-regen.md` — Tick Sequence step 9

The `tick()` function calls `executePotion(action.type, action.potion)` without `await` (line 123), but `executePotion` is `async` (line 136) and internally does `await swap()` before calling `use_skill()`. The tick immediately returns `cooldownDelay()`. If the next tick fires before `executePotion` completes its `await swap()`, the cooldown gate (`Date.now() < parent.next_skill.use_hp`) won't be set yet because `use_skill()` hasn't been called. This can cause duplicate recovery attempts or potions consumed in wrong order.

**Evidence**: `tick()` is synchronous, returns `cooldownDelay()` at line 129. `executePotion` at line 136 is `async function`. `swap()` at lines 149, 166 are awaited inside `executePotion`. Between the `await swap()` and the `use_skill()` call, another tick can fire because no cooldown has been set yet.

**Recommendation**: Either make `tick()` async-aware (track an in-flight flag to prevent re-entry) or restructure so swap and use_skill are atomic from the tick's perspective.

---

#### B2: Missing respawn implementation (R3 violation)

**Files**: `src/objective.js:65-76`, all other src files
**Contract**: `docs/contracts/objective.md` — Hunter strategy recover state
**Requirement**: R3 — "detect death, respawn, resume objective"

The hunter strategy correctly detects death (`character.rip`) and transitions to `recover` state. However, no system ever calls `respawn()`. The bot detects death but never recovers from it. The game API `respawn()` function exists but is never invoked anywhere in the codebase.

**Evidence**: `grep -r "respawn" src/` returns zero matches.

**Recommendation**: Add `respawn()` call in the objective system's recover handler, or in a dedicated death-recovery tick within the hunter strategy. The contract should specify respawn timing (immediate vs. wait for conditions).

---

#### B3: Likely hallucinated `G.base_gold` reference

**Files**: `src/utils.js:322-327`
**Contract**: `docs/game-api.md` — G data structure

`getFarmabilityData()` reads `G.base_gold[monsterType]` to calculate gold per kill. However, `G.base_gold` is not documented in `docs/game-api.md`, not referenced in any game API documentation, and does not appear in the G data structure description. The known gold-related data is `G.items[name].g` (item gold value) and monster drop tables, but not a direct `base_gold` mapping.

**Evidence**: `docs/game-api.md` documents `G.maps`, `G.npcs`, `G.monsters`, `G.items`, `G.skills`, `G.classes`, `G.conditions`, `G.drops`, `G.geometry` — no `G.base_gold`. The server reference repos should be checked to confirm, but this has high hallucination probability.

**Recommendation**: Verify `G.base_gold` against the actual game data object in-browser (`Object.keys(G)` in console). If it doesn't exist, either derive gold gain from `G.drops` tables or remove the gold_gain calculation from the MVP farmability assessment.

---

#### B4: `isFriendly` defined three times with divergent logic (DRY violation)

**Files**: `src/world-model.js:25-30`, `src/party.js:19-35`, `src/utils.js:400-405`

Three independent implementations of "is this entity friendly?" with different criteria:

| Location | Checks owner | Checks party | Checks config.friendlyPlayers | Checks character.friends | Checks roster | Checks entity visibility |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|
| world-model.js:25 | Yes | Yes | Yes | No | No | No |
| party.js:19 | No | No | No | No | Yes (roster.available) | Yes (parent.entities) |
| utils.js:400 | Yes | Yes | No | Yes (unverified API) | No | No |

Each implementation could produce different results for the same entity. This violates M4 (centralize shared solutions) and creates a correctness risk — a player considered friendly by world-model might not be considered friendly by party, or vice versa.

**Additional concern**: `utils.js:403` uses `character.friends` which is marked as "Unverified" in `docs/game-api.md`. This is a hallucination risk for the property structure.

**Recommendation**: Consolidate into a single `isFriendly(entity, ctx)` in `utils.js` that combines all legitimate checks (owner, party, config.friendlyPlayers, roster). Remove the per-file implementations. Defer `character.friends` usage until the API is verified.

---

#### B5: Party request acceptance uses wrong API function

**Files**: `src/party.js:280-281`
**Contract**: `docs/contracts/party.md` — Party Assembly

```javascript
on_party_invite = handlePartyInvite;
on_party_request = handlePartyInvite;  // same handler
```

Both handlers call `accept_party_invite(name)` (line 273). However, `on_party_request` fires when another character requests to join YOUR party — this likely requires `accept_party_request(name)`, not `accept_party_invite(name)`. Using the wrong acceptance function would silently fail to accept party requests from combat characters.

**Evidence**: The party assembly logic (line 164-168) has merchants send invites and combat characters send requests to the merchant. If the merchant's `on_party_request` handler calls `accept_party_invite` instead of `accept_party_request`, the merchant will never accept combat characters' requests.

**Note**: `docs/game-api.md` marks "party acceptance callbacks" as Unverified. This needs in-game verification.

**Recommendation**: Verify the correct game API for accepting party requests. Create separate handlers if the accept functions differ. Test party formation with merchant + hunter characters.

---

### Warnings

#### W1: No execution ordering guarantee between systems

**Files**: `src/scheduler.js:83-91`, `src/boot.js:72-102`
**Contract**: `docs/architecture/context-map.md` — Execution order

The architecture specifies "WorldModel -> Objective -> Targeting -> Party -> All others" but the scheduler uses independent `setTimeout` chains with no ordering guarantee. Each system's first tick fires after its configured interval, so targeting (250ms) fires BEFORE world-model (500ms) on the first cycle.

After initial startup, there's no guarantee that world-model completes before targeting reads `ctx.world` in any given cycle. The systems could interleave arbitrarily.

**Impact**: Targeting may read stale `ctx.world` data (one cycle old). On first boot, targeting sees empty `ctx.world` arrays. In practice this causes a 250-500ms delay in target acquisition after boot — not a crash, but a contract ordering violation.

**Recommendation**: Either accept the eventual-consistency model and document it (removing the ordering claim from context-map), or implement priority-based scheduling where writers complete before readers within each tick window.

---

#### W2: World-model party member misclassification when solo

**Files**: `src/world-model.js:59`

```javascript
if (isFriendly(e) && e.party === character.party) {
```

When the character is solo (`character.party` is null/undefined), `e.party === character.party` evaluates to `null === null` → `true` for any entity also not in a party. Combined with `isFriendly(e)` returning true for same-owner characters, this classifies ALL nearby own-account characters as `partyMembers` even when not actually in a party.

**Impact**: Heal targeting would attempt to heal characters the healer may not be grouped with. Tank calculation would include characters not actually coordinating.

**Recommendation**: Add an explicit null-guard: `if (isFriendly(e) && character.party && e.party === character.party)`.

---

#### W3: farmTarget not dynamically read from localStorage

**Files**: `src/configuration.js:93-99`, `src/objective.js:83`
**Contract**: `docs/contracts/configuration.md` — "farmTarget is read dynamically from localStorage"

`farmTarget` is read from localStorage only during `loadLocalStorageValues()` (called at boot and on `reload()`). No system calls `config.reload()` periodically. The objective system reads `ctx.config.farmTarget` but doesn't trigger a reload. Changes to `al_bot:config:farmTarget` in localStorage are never picked up during runtime.

**Impact**: Users cannot change farm targets without restarting the bot. The contract promises dynamic reads.

**Recommendation**: Either have the objective system call `config.reload()` before reading farmTarget each tick, or have configuration read farmTarget directly from localStorage on each access.

---

#### W4: Party travel sync not implemented

**Files**: `src/movement.js`, `src/party.js`
**Contract**: `docs/contracts/movement.md` — Party Travel Sync (R51), `docs/contracts/party.md` — Travel Coordination

The contracts specify speed matching via `ctx.party.travelSync` and a localStorage checkpoint protocol (`al_bot:party:travel`). Neither is implemented:
- Movement never reads `ctx.party.travelSync`
- Party never writes travel coordination data to localStorage
- `ctx.party.travelSync` is initialized with default values but never updated

**Impact**: Party members travel independently at their own speeds. Not a crash, but R51 is unsatisfied.

**Recommendation**: This is acceptable for initial MVP if documented as deferred. Update the contracts to mark travel sync as Phase 3+ or later. Currently the contracts imply it should be present.

---

#### W5: Empty catch blocks violate JavaScript standards

**Files**: Multiple locations
**Standard**: `.agent/standards/languages/javascript.md` — "MUST NOT use empty catch blocks"

| File | Line | Context |
|------|------|---------|
| `src/attack.js:23` | `catch (e) { /* loot errors non-critical */ }` | Has comment but no logging |
| `src/potion-regen.js:167` | `catch (e) { /* best effort */ }` | Swap fallback, no logging |
| `src/movement.js:181` | `catch (e) { /* best effort */ }` | stop() in cancelTravel |
| `src/movement.js:271` | `catch (e) { /* best effort */ }` | approach fallback |

**Recommendation**: Add `ctx.logger.debug(...)` calls in each catch block. The standard requires at minimum logging the error with context.

---

#### W6: Context-map execution order doesn't match boot.js registration

**Files**: `docs/architecture/context-map.md`, `src/boot.js:72-102`

Context-map says: "WorldModel -> Objective -> Targeting -> Party -> All others"
Boot.js registers: world-model -> objective -> **party** -> **targeting** -> actions

Party and targeting are swapped. While the scheduler doesn't enforce ordering (W1), the documented order should match the intended design.

**Recommendation**: Update either the context-map or boot.js registration order to match. Since party writes ctx.party.tank which targeting may use for future aggro coordination, party before targeting is arguably more correct — update the context-map.

---

#### W7: `character.friends` usage is unverified

**Files**: `src/utils.js:403`
**Reference**: `docs/game-api.md` — Unverified section

`isFriendly()` in utils.js checks `character.friends && character.friends.includes(entity.owner)`. The `character.friends` structure is listed as "Unverified" in the game API reference. If it doesn't exist or has a different shape (e.g., object instead of array), this would silently fail or throw.

**Recommendation**: Verify `character.friends` in-game. If unverified, remove the check and rely on `ctx.config.friendlyPlayers` (which is explicitly configured).

---

#### W8: Merchant targeting runs every 250ms doing nothing

**Files**: `src/boot.js:55-67, 82`

When `isMerchant` is true, `targetingStrategies` is empty (line 55-65). `createTargeting(ctx, [])` is called, and registered at 250ms interval. Every tick, the targeting system evaluates zero strategies, clears targets, and writes to ctx.targeting — purely wasted cycles.

**Recommendation**: Skip targeting registration for merchants: `if (!isMerchant) { scheduler.register('targeting', ...) }`. Movement and other systems should handle null `ctx.targeting` gracefully (most already do with optional chaining).

---

#### W9: Merchant objective strategy is a non-functional stub

**Files**: `src/boot.js:49-50`

```javascript
? { name: 'merchant', evaluate() { return null; }, advanceStep() { return null; } }
```

The merchant strategy always returns null, meaning `ctx.objective` stays at `{ type: 'idle' }` permanently. The objective system still runs every 2s doing nothing useful. Combined with W8, merchant characters have two systems running idle ticks with no effect.

**Impact**: No immediate bug, but the merchant never does anything beyond party management, status publishing, and potion recovery. This is expected for pre-Phase-4 but should be documented.

**Recommendation**: Add a code comment noting this is a Phase 4 placeholder. Consider not registering the objective system for merchants until the merchant strategy is implemented.

---

### Suggestions

#### S1: Combat-skills has misplaced/missing JSDoc

**Files**: `src/combat-skills.js:25-30, 94`

Lines 25-30 have a JSDoc block for `createCombatSkills` but it's followed by `createPriestSkillStrategy` at line 37 — the JSDoc is orphaned. The actual `createCombatSkills` function at line 94 has no JSDoc. Per JavaScript standards, exported factory functions MUST have JSDoc.

---

#### S2: Phase 4 utility stubs throw on call

**Files**: `src/utils.js:431-500`

Nine functions (`depositItems`, `retrieveItem`, `depositJunk`, `buyItem`, `sellItem`, `findSellableItems`, `getGoldBaseline`, `updateGoldBaseline`) throw `Error('Phase 4: not yet implemented')`. These are exported and importable — any accidental import and call would crash the bot.

**Recommendation**: Either remove until Phase 4 implementation or don't export them. Dead code that can crash is worse than no code.

---

#### S3: `damageReduction` formula unverified against game server

**Files**: `src/utils.js:222-236`
**Reference**: Server reference repos

The damage reduction formula (each 100 points = 10% reduction with 0.9x diminishing returns per block) is implemented from intent documentation. The actual game server formula should be verified against the server reference code in `../IkeBot/reference/common_engine/` to ensure accuracy.

---

#### S4: World-model monster classification can double-count

**Files**: `src/world-model.js:73-92`

A monster matching `ctx.config.farmTarget` AND having `hp < character.attack * 0.8` will appear in BOTH `targetMonsters` AND `easyMonsters`. A special monster with low HP appears in both `specialMonsters` and `easyMonsters`. This doesn't cause bugs (targeting handles tier priority) but inflates array sizes and could confuse diagnostic logging.

---

## Cross-Cutting Observations

### Architecture and Design Patterns

The system composition with shared context (D1) is well-implemented. Each system is a clean factory function receiving `ctx`, strategy pattern (D3) is used consistently for behavioral variation, and the scheduler (D2) provides proper lifecycle management. The decomposition of the old combat system into targeting + attack + combat-skills is a clear improvement with good separation of concerns.

### Game API Alignment

Most game API usage is correct and aligns with `docs/game-api.md`:
- Cooldown checks via `parent.next_skill` are correct
- Entity property access (real_x/real_y, going_x/going_y, visible, dead, rip) matches documented properties
- `can_attack()`, `attack()`, `heal()`, `distance()`, `loot()`, `get_chests()` usage is correct
- `smart_move()`, `move()`, `stop()` usage is correct
- `localStorage` key convention (`al_bot:` prefix) is consistent

**Exceptions**: B3 (`G.base_gold`), B5 (`accept_party_request` vs `accept_party_invite`), W7 (`character.friends`).

### Standards Adherence

- File-level doc comments: Present on all files. Good.
- JSDoc on exports: Present on most exports. S1 notes one gap.
- Error handling: Consistent try/catch in tick functions. W5 notes empty catch blocks.
- `const`/`let` usage: Consistent, no `var`. Good.
- Factory functions and plain objects: Consistent, no class hierarchies. Good.
- State management: localStorage keys are prefixed and documented. Good.

### Requirement Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| R1 (bootstrap) | Satisfied | boot.js wires all systems cleanly |
| R2 (loop lifecycle) | Satisfied | scheduler start/stop/pause/resume |
| R3 (death recovery) | **Not satisfied** | B2 — no respawn() call |
| R4 (state recovery) | Partial | Configuration reads localStorage at boot; no persist-on-change |
| R5 (world view) | Satisfied | world-model categorizes entities |
| R7 (party) | Satisfied | party.js auto-invite/accept |
| R8 (cross-char comm) | Satisfied | CM protocol + localStorage |
| R9 (movement abstraction) | Satisfied | strategy pattern |
| R10 (travel vs combat) | Satisfied | mode-based movement |
| R11 (priority targeting) | Satisfied | tiered priority chain |
| R12 (class-aware combat) | Satisfied | melee/ranged/heal strategies |
| R13 (HP/MP recovery) | Satisfied (with B1 caveat) | potion-regen system |
| R15 (separated intent/execution) | Satisfied | objective -> targeting -> attack |
| R17 (structured logging) | Satisfied | logging system with levels |
| R19 (centralized config) | Satisfied | configuration.js |
| R51 (party travel sync) | **Not satisfied** | W4 — not implemented |

---

## Resolution Priority

1. **B1** (async race) — Highest risk of runtime misbehavior
2. **B2** (no respawn) — Bot is permanently dead on first death
3. **B3** (G.base_gold) — Will crash if the property doesn't exist
4. **B4** (isFriendly duplication) — Correctness risk across systems
5. **B5** (party request accept) — Party formation may silently fail
6. **W1+W6** (execution ordering) — Document the actual model or fix it
7. **W2** (solo party members) — Incorrect heal targeting when solo
8. **W3** (farmTarget) — Contract violation, user-facing impact
9. **W5** (empty catches) — Standards violation, easy fix
