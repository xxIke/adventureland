# Implementation Review — v0.1.0 (Revised)

**Date**: 2026-04-10 (revised with owner feedback)
**Scope**: Full implementation review of all src/*.js against documented contracts, intent, requirements, architecture, and game API reference
**Branch**: v0.1.0
**Reviewer**: Claude (implementation-review skill)

## Summary

Implementation covers Phases 0-3 (infrastructure, core systems, combat decomposition, objective/party). Code is well-structured with clean separation of concerns, consistent factory-function patterns, and proper strategy composition. Phase 2 combat decomposition (targeting + attack + combat-skills) and Phase 1 infrastructure are solid.

However, the review identified **7 blockers**, **8 warnings**, and **3 suggestions**. The most critical systemic finding is that **nearly all MVP merchant operations and coordination logic is missing** — the merchant character is a non-functional stub despite extensive requirements (R21-R26, R30, R52-R58) and documented contracts specifying MVP merchant objectives. Additional blockers include missing respawn logic (third documented failure to implement R3), potion priority inversion, and party member misclassification.

---

## Findings

### Blockers

#### B1: Missing respawn implementation (R3 — third implementation failure)

**Files**: `src/objective.js:65-76`, all other src files
**Contract**: `docs/contracts/objective.md` — Hunter strategy recover state
**Requirement**: R3 — "detect death, respawn, resume objective"
**Intent**: `docs/intent/recovery.md` — "Auto-respawn after configurable delay (e.g., 15 seconds)"

The hunter strategy correctly detects death (`character.rip`) and transitions to `recover` state. However, no system ever calls `respawn()`. The bot detects death but never recovers from it.

**Evidence**: `grep -r "respawn" src/` returns zero matches. This is the third round of this requirement being documented/designed but not implemented.

**Prior art**: hyper-fixate (`codes/5-bot_base.5.js:695-701`) implements respawn as:
```javascript
respawn_check() {
    if (character.rip && !this._timeouts.respawn) {
        this._timeouts.respawn = setTimeout(() => {
            respawn(); this._timeouts.respawn = undefined;
        }, this._intervals.respawn) // 15000ms
    }
    return character.rip;
}
```

**Pattern concern**: Three rounds of documentation capture this as a need, but implementation has never produced the actual `respawn()` call. This may indicate a systematic gap where "detect and idle" is being confused with "detect and recover." The recovery implementation needs to include the actual game API call, not just state detection.

**Corrective action**:
1. Add `respawn()` call in the objective system's recover handler, gated on `character.rip` being true AND death cooldown having elapsed (character is ready for respawn — status effect has lifted)
2. Use a delay/guard to prevent rapid respawn loops (15s per prior art)
3. After respawn, objective naturally re-evaluates and resumes farming via travel → farm flow
4. Log death event with context (location, cause if determinable)

---

#### B2: Potion use priority inverted from intent

**Files**: `src/potion-regen.js:107-118`
**Intent**: `docs/intent/sustain.md` — HP Recovery, MP Recovery

The current implementation always selects HP over MP when both need recovery:

```javascript
if (hpTier && mpTier) {
    action = { type: 'hp', potion: hpTier };  // HP always wins
```

The intent explicitly states the opposite priority model:
- "Prioritized against mana recovery with **mp regen having a higher priority when tied**"
- "Mana recovery is more critical than health recovery as **mp is required even for basic attacks**"
- "System should prioritize keeping **mana topped off for damage output** and larger (highly effective) bursts of hp recovery"

**Correct priority model per intent**:
1. Whichever resource has the highest-urgency need wins (higher potion tier = higher urgency)
2. When tied (same urgency tier or both need regen), **MP wins** because MP is required for all actions including basic attacks
3. The logic should compare the selected tiers and pick the one representing a more critical deficit

**Corrective action**: Restructure the priority selection to compare HP and MP urgency. When both need recovery at the same tier, MP takes priority. When one needs a higher-tier potion than the other, the higher-tier need wins.

---

#### B3: `isFriendly` defined three times with divergent logic (DRY/M4 violation)

**Files**: `src/world-model.js:25-30`, `src/party.js:19-35`, `src/utils.js:400-405`

Three independent implementations of "is this entity friendly?" with different criteria:

| Location | Checks owner | Checks party | Checks config.friendlyPlayers | Checks character.friends | Checks roster | Checks entity visibility |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|
| world-model.js:25 | Yes | Yes | Yes | No | No | No |
| party.js:19 | No | No | No | No | Yes (roster.available) | Yes (parent.entities) |
| utils.js:400 | Yes | Yes | No | Yes | No | No |

Each implementation produces different results for the same entity. This violates M4 (centralize shared solutions) and creates a correctness risk — a player considered friendly by world-model might not be considered friendly by party, or vice versa.

**Note**: `character.friends` is now verified as a real game API feature. The `docs/game-api.md` "Unverified" annotation should be updated.

**Corrective action**: Consolidate into a single `isFriendly(entity, ctx)` in `utils.js` that combines all legitimate checks (owner, party, character.friends, config.friendlyPlayers, roster). All consuming systems import and call the utility. Remove per-file implementations.

---

#### B4: Null-guard and improper value reference failures across codebase

**Class of bug**: Equality comparisons, property access, and function return values where null/undefined is not properly guarded. Full codebase audit results below. Game globals (`character`, `parent`, `G`) are guaranteed by the runtime and excluded.

**HIGH — Silent wrong behavior**:

| File | Line | Expression | Impact |
|------|------|-----------|--------|
| `world-model.js:59` | `e.party === character.party` | Neither side null-guarded. When solo (both null), `null === null` is true — all same-owner characters become "party members." Cascades into heal targeting, tank calc, party DPS. |
| `world-model.js:27` | `entity.party && entity.party === character.party` | Left guarded, right (`character.party`) not. If `character.party` is null and `entity.party` is truthy, comparison is safe — but the pattern is incomplete and the same expression at line 59 has no left guard either. |
| `utils.js:402` | `entity.party && entity.party === character.party` | Same partial-guard as world-model.js:27. |
| `potion-regen.js:76` | `parent.next_skill.use_hp - Date.now()` | If `parent.next_skill.use_hp` is undefined (before first skill use), arithmetic produces `NaN`. Returned as `{ delay: NaN }` which breaks scheduler timing — tick fires immediately/erratically. |
| `potion-regen.js:83` | `Date.now() < parent.next_skill.use_hp` | If `use_hp` undefined, comparison is `false` — cooldown check always passes, potions attempted every tick with no gating. |
| `targeting.js:185-186` | `character.heal * 0.8` / `member.max_hp * 0.75` | If `character.heal` is 0 or undefined (non-healer), `missing >= undefined * 0.8` is always false — heal qualification silently broken. Guard at line 172 (`character.heal > 0`) is in the strategy, but the comparison itself is fragile if ever called from elsewhere. |

**MEDIUM — Crashes on edge conditions**:

| File | Line | Expression | Impact |
|------|------|-----------|--------|
| `objective.js:84` | `location.coord.map` | Checks `if (location &&` but accesses `location.coord.map` without checking `location.coord`. If `findMonsterLocation` returns `{ coord: undefined }`, crashes. |
| `objective.js:100-102` | `location.coord.x - character.real_x` | Same — `location.coord` not validated after `location` truthiness check. |
| `party.js:23` | `for (const c of roster.available)` | `roster.available` could be undefined if `loadAvailableRoster()` fails and catch sets `available = []` — but if `roster` object is malformed from other code paths, `roster.available` crashes. |
| `party.js:106` | `for (const name of roster.active)` | `roster.active` could be undefined if localStorage parse fails and all catch paths miss this state. |
| `party.js:154` | `const currentParty = get_party()` | Return value not validated. If `get_party()` returns null/undefined, `currentParty[name]` at line 158 crashes. |
| `targeting.js:181` | `member.max_hp - member.hp` | Iterates `ctx.world.partyMembers` — if array contains a null entry (shouldn't per world-model, but defensive gap), crashes. |
| `combat-skills.js:44` | `m.hp < m.max_hp * 0.8` | Same partyMembers null-entry risk. |
| `party.js:71-74` | `calculateTankScore(member)` / `member.name` | Same — members array iterated without null check on entries. |

**Corrective action**:
1. **Null equality guards**: All `=== character.party` and similar comparisons where either side can be null must guard both sides: `character.party && e.party && e.party === character.party`
2. **Cooldown guards**: `parent.next_skill.use_hp` must be checked for existence before arithmetic: `const cd = parent.next_skill?.use_hp; if (!cd || Date.now() >= cd) { ... }`
3. **Nested property access**: After checking an object is truthy, validate nested properties before accessing them: `if (location && location.coord && location.coord.map !== character.map)`
4. **Function return validation**: `get_party()` and similar game API calls should have their return values validated before property access
5. **Array iteration safety**: When iterating arrays that come from ctx (which may not be fully populated), guard against null entries: `if (!member) continue`

---

#### B5: Party request acceptance uses wrong API function

**Files**: `src/party.js:271-281`
**Contract**: `docs/contracts/party.md` — Party Assembly

```javascript
on_party_invite = handlePartyInvite;
on_party_request = handlePartyInvite;  // same handler, calls accept_party_invite
```

Both handlers call `accept_party_invite(name)` (line 273). The `on_party_request` callback fires when another character requests to join YOUR party — this requires `accept_party_request(name)`.

**Prior art**: hyper-fixate (`codes/5-bot_base.5.js:8-16`, `codes/25-bot_base.25.js:11-33`) correctly uses separate functions:
```javascript
function on_party_invite(name) {
    if (is_friendly(name)) { accept_party_invite(name) }
}
function on_party_request(name) {
    if (is_friendly(name)) { accept_party_request(name) }
}
```

**Impact**: The merchant will never accept combat characters' party requests. Party formation fails for any character that sends a request rather than an invite.

**Corrective action**: Create separate handlers. `on_party_invite` calls `accept_party_invite(name)`. `on_party_request` calls `accept_party_request(name)`. Both validate via the consolidated `isFriendly` utility.

---

#### B6: Party travel sync not implemented (R51 — MVP must)

**Files**: `src/movement.js`, `src/party.js`
**Contract**: `docs/contracts/movement.md` — Party Travel Sync (R51), `docs/contracts/party.md` — Travel Coordination
**Requirement**: R51 — "party travel sync" (must)

Travel sync is an explicit MVP requirement. The contracts specify speed matching via `ctx.party.travelSync` and a localStorage checkpoint protocol. Neither is implemented:
- Movement never reads `ctx.party.travelSync`
- Party never writes travel coordination data to localStorage
- `ctx.party.travelSync` is initialized with default values but never updated
- No slowest-member speed detection
- No speed limiting during group travel

**MVP intent**: Before long-distance travel, characters sync their travel speed to the slowest party member, then initiate long-distance travel. Once arrived, they reset their speeds to max speed.

**Corrective action**:
1. Party system: when objective is travel, calculate slowest party member speed from status snapshots, write to `ctx.party.travelSync` and localStorage `al_bot:party:travel`
2. Movement system: when in travel mode and `ctx.party.travelSync.active` is true, cap movement speed to `travelSync.slowestSpeed`
3. On travel arrival, reset `travelSync.active` to false so characters return to full speed

---

#### B7: Merchant objective strategy entirely missing (R21-R26, R52-R58 — MVP must)

**Files**: `src/boot.js:49-50`, `src/objective.js`
**Requirements**: R21, R22, R23, R24, R26, R30, R52, R53, R54, R55, R56, R58 (all "must" priority)

The merchant objective strategy is a non-functional stub:
```javascript
{ name: 'merchant', evaluate() { return null; }, advanceStep() { return null; } }
```

The merchant character permanently idles. None of the documented MVP merchant objectives are implemented:

| Objective | Requirement | Status |
|-----------|-------------|--------|
| Resupply hunters | R23, R24 | **Not implemented** — status snapshots published but no merchant reads them or initiates resupply |
| NPC selling (Ponty) | R53 | **Not implemented** — stub throws |
| Gold management | R54 | **Not implemented** — stub throws |
| Trade-slot resupply | R55 | **Not implemented** — no trade logic |
| Gear delivery | R56 | **Not implemented** — no catalogue, no delivery |
| Bank operations | R58 | **Not implemented** — stub throws |
| Upgrade/compound | R26 | **Not implemented** — no workflow |
| Inventory awareness | R21 | **Partial** — utility functions exist but not integrated into merchant decisions |
| Equipment upgrade ID | R22 | **Partial** — `isUpgrade()` exists but not used |
| Party-capable targeting | R30 | **Partial** — `canFight()`/`getFarmabilityData()` exist but never called |

The `src/utils.js` Phase 4 stubs (`depositItems`, `retrieveItem`, `buyItem`, `sellItem`, `findSellableItems`, `getGoldBaseline`, `updateGoldBaseline`) all throw `Error('Phase 4: not yet implemented')`. These are referenced in documentation as MVP functionality.

**Impact**: The merchant character does nothing useful beyond party management and potion recovery. The entire merchant coordination loop (monitor hunters -> detect needs -> travel to resupply -> deliver -> return to post) is absent.

**Corrective action**: Implement the merchant strategy with at minimum: idle evaluation -> restock detection from hunter status snapshots -> buy potions from NPC -> travel to hunters -> open trade -> return. The documented multi-step workflow in the objective contract provides the full specification.

---

### Warnings

#### W1: No execution ordering guarantee between systems

**Files**: `src/scheduler.js:83-91`, `src/boot.js:72-102`
**Contract**: `docs/architecture/context-map.md` — Execution order

The scheduler uses independent `setTimeout` chains with no ordering guarantee. Each system's first tick fires after its configured interval, so targeting (250ms) fires BEFORE world-model (500ms) on the first cycle.

**Corrective action**: Two changes needed:
1. **Initial population**: All systems should perform an initial synchronous run during boot (after construction, before `scheduler.start()`) to populate their ctx slots. This ensures all downstream systems see initialized context on their first real tick.
2. **Tick guards**: Each system should validate that its ctx dependencies have been populated before executing its cycle. If `ctx.world.lastUpdated` is undefined, targeting should skip/idle that tick.

---

#### W2: Potion-regen async race condition (edge case)

**Files**: `src/potion-regen.js:122-129`
**Contract**: `docs/contracts/potion-regen.md` — Tick Sequence step 9

The `tick()` function calls `executePotion(action.type, action.potion)` without `await` (line 123), but `executePotion` is `async` (line 136) and internally does `await swap()` before calling `use_skill()`. The tick immediately returns `cooldownDelay()`.

**Risk assessment**: Low threat edge case — the actions should complete within the 50ms grace window between repetitive calls. However, under network latency or if `swap()` is slow, duplicate recovery attempts are possible.

**Corrective action**: Add async-awareness to prevent re-entry. A simple in-flight flag (`let potionInFlight = false`) set before `executePotion` and cleared in its finally block would prevent the next tick from starting a second potion action while one is in progress.

---

#### W3: farmTarget not dynamically read — merchant coordination gap

**Files**: `src/configuration.js:93-99`, `src/objective.js:83`, `src/party.js:253-258`
**Contract**: `docs/contracts/configuration.md`, `docs/intent/party.md`

Two related gaps in merchant-to-hunter farm target coordination:

**Gap 1 — Config not dynamic**: `farmTarget` is read from localStorage only at boot and on `reload()`. No system calls `config.reload()` periodically. The merchant cannot update the farm target and have hunters respond.

**Gap 2 — CM objective-directive is a no-op**: The party system receives `objective-directive` CM messages but only logs them:
```javascript
case 'objective-directive':
    ctx.logger.info('party', `objective-directive from ${sender}: ${JSON.stringify(data.data)}`);
    break;  // no action taken
```

The intent specifies that the merchant should be able to direct hunters to change farm targets via CM and/or localStorage. The current implementation has the plumbing (CM message type defined, handler registered) but no wiring to actually update `ctx.config.farmTarget` or `ctx.objective` when a directive arrives.

**Corrective action**:
1. The `objective-directive` CM handler should update `ctx.config.farmTarget` (or write to localStorage and trigger `config.reload()`) when receiving a farm target change from the merchant
2. The objective system should either call `config.reload()` each tick or read farmTarget directly from localStorage
3. The event bus could emit a signal (e.g., `config:farm-target-changed`) so dependent systems (objective, targeting) re-evaluate immediately rather than waiting for their next tick

---

#### W4: Context-map execution order doesn't match boot.js and is partially invalid

**Files**: `docs/architecture/context-map.md`, `src/boot.js:72-102`

Context-map says: "WorldModel -> Objective -> Targeting -> Party -> All others"
Boot.js registers: world-model -> objective -> **party** -> **targeting** -> actions

**Additional concern**: The context-map implies party tank determination happens in a single boot cycle. This is invalid — a single character cannot determine the party tank on load. Tank calculation requires all bots to be online, initialized, and publishing status snapshots. The merchant then evaluates from localStorage and stores party stats. This is an inherently async multi-character process, not a boot-time ordering concern.

**Corrective action**: Update context-map to:
1. Reflect boot.js order: WorldModel -> Objective -> Party -> Targeting -> All others
2. Document that party stats (tank, DPS) are eventual — they become available after all characters have booted, published status, and the merchant has calculated and written `al_bot:party:stats`
3. Systems reading `ctx.party.tank` must handle null gracefully (solo/pre-calculation state)

---

#### W5: Empty catch blocks violate JavaScript standards

**Files**: Multiple locations
**Standard**: `.agent/standards/languages/javascript.md` — "MUST NOT use empty catch blocks"

| File | Line | Context |
|------|------|---------|
| `src/attack.js:23` | `catch (e) { /* loot errors non-critical */ }` | Has comment but no logging |
| `src/potion-regen.js:126` | `use_skill(skill).catch(() => {})` | Silent swallow on regen fallback |
| `src/potion-regen.js:167` | `catch (e) { /* best effort */ }` | Swap fallback, no logging |
| `src/movement.js:181` | `catch (e) { /* best effort */ }` | stop() in cancelTravel |
| `src/movement.js:271` | `catch (e) { /* best effort */ }` | approach fallback |

**Corrective action**: Add `ctx.logger.debug(...)` calls in each catch block with context about what failed and why it's non-critical.

---

#### W6: DPS/TTK utility design conflates two incompatible models — needs restructure

**Files**: `src/utils.js:222-333`, `src/party.js:119-122`
**Requirements**: R30 (party-capable targeting), R35 (monster danger/reward assessment)

The codebase has two DPS models mixed into the same functions:

| Model | Formula | Purpose |
|-------|---------|---------|
| **basic_dps** (MVP) | `sum(attack * frequency)` | Party-level capability gate, not target-dependent |
| **estimateDPS** (post-MVP) | `attack * freq * damageMult * hitRate` with armor/resistance/damage_type | Per-target assessment requiring weapon types, defense stats, verified server formulas |

The current `estimateDPS()` takes an attacker and optional target, mixing simple and complex paths in one function. `canFight()` calls `estimateDPS(monster)` (complex function, no target) for monster damage but uses `basic_dps` (simple) for party damage — an asymmetric comparison using two different calculation models. This conflation means any system calling these utilities gets inconsistent results depending on which arguments are passed.

**The core problem is not that the complex model is unverified — it's that target-dependent DPS calculation requires fundamentally different inputs** (per-character damage types, weapon resolution, target defense stats) that are not available in the MVP design. Using the complex model anywhere in the MVP path creates system mismatches where one side of a comparison accounts for defenses and the other doesn't.

**Additionally**: None of these functions are ever called by any active system. The hunter strategy farms unconditionally.

**Corrective design** (per owner direction):

1. **`estimateDPS(entities[])` → `{ basic_dps: number }`**
   - Takes a list of entities (party members, or a single monster)
   - Returns an `estimatedDPS` object with currently one field: `basic_dps` (simple `sum(attack * frequency)`)
   - No target-dependent calculations at this time — ensures consistency regardless of what entities are passed
   - Object return type is extensible for future fields (e.g., `physical_dps`, `magical_dps`) when the per-target system is designed

2. **`estimateTTK(target, estimatedDPS)` → `{ basic_ttk: number }`**
   - Takes a target entity and an `estimatedDPS` object
   - Returns an `estimatedTTK` object with currently one field: `basic_ttk` (using `basic_dps` and `target.max_hp`)
   - Object return type is extensible for future fields

3. **`canFight(monsterType, partyEstimatedDPS)`**
   - Creates/forecasts relevant monster entities for appropriate levels using `G.monsters` data
   - Calls `estimateDPS([monster])` for monster offense and uses the passed `partyEstimatedDPS` for party offense
   - Both sides use the same `basic_dps` field — consistent, symmetric comparison
   - Uses `estimateTTK` for time-to-kill assessment

4. **`damageReduction()` and armor/resistance helpers**: Acceptable to keep as dormant code. They belong to a future target-dependent DPS system that requires additional design (per-character damage types, weapon type resolution, verified server formulas) before integration.

5. **Integration**: Wire `canFight()` into the hunter strategy to gate farm target selection on party capability (R30). Party's `basic_dps` calculation in `party.js` feeds into this as the party's `estimatedDPS` object.

---

#### W7: easyMonsters uses `hp` instead of `max_hp`

**Files**: `src/world-model.js:89`

```javascript
if (e.hp < character.attack * 0.8) {
```

Uses current `hp` which means a monster that's been damaged by another player would temporarily qualify as "easy" even if it's normally strong. The intent is to classify monsters that are inherently weak — should use `max_hp` instead. Additionally, the `xp > 0` filter (applied at line 74 for the general monster block) should also be applied here to ensure easy monsters are worth killing.

**Corrective action**: Change to `e.max_hp < character.attack * 0.8`. The `xp > 0` check already exists at the monster block level (line 74, `if (e.xp < 0) continue`), so it applies.

---

#### W8: State persistence incomplete (R4)

**Files**: `src/configuration.js`, `src/objective.js`, `src/party.js`
**Requirement**: R4 — "persist on major state changes and every 5 minutes"
**Intent**: `docs/intent/recovery.md` — State Persistence on Disconnect

Configuration reads from localStorage at boot. Party publishes status snapshots. But:
- Objective state is not persisted — multi-step workflows lose progress on reload
- No periodic persistence timer (intent says every 5 minutes)
- `config.toggles.recoveryEnabled` exists but is never checked by any system
- No detection of fresh start vs. recovery (intent specifies dev/production flag)

**Corrective action**: For MVP, the stateless-tick design provides implicit recovery for most hunter systems (objective re-derives from config.farmTarget each tick). Document this as acceptable. For merchant workflows, objective state persistence is needed before those workflows are implemented (B7). Add the 5-minute persistence timer for logging snapshots.

---

### Suggestions

#### S1: Merchant targeting should be retained for future use

**Files**: `src/boot.js:55-67, 82`

Per owner feedback, merchant targeting is the correct place for trade fulfillment target selection (merchant's "attack" is fulfilling trades). Merchant targeting will grow to support how targets are selected for skill use (mluck, buff, bless). Retain the registration but add a merchant-specific targeting strategy rather than running with empty strategies.

---

#### S2: Armor/resistance reduction helpers are acceptable dormant code

**Files**: `src/utils.js:222-236`

`damageReduction()` and the armor/resistance logic are acceptable to keep. They become relevant when a future target-dependent DPS system is designed (requiring per-character damage types, weapon resolution, verified server formulas). Until then they must not be called from any MVP path — W6's restructure ensures this by making `estimateDPS` return only `basic_dps` with no target-dependent calculation.

---

#### S3: World-model monster double-counting is acceptable

**Files**: `src/world-model.js:73-92`

A monster can appear in multiple lists (targetMonsters + easyMonsters, specialMonsters + easyMonsters). Per owner feedback, this is acceptable — the lists represent different classification axes and targeting handles tier priority. No change needed.

---

## Synthesized Issues

These are larger patterns identified by combining individual findings with owner feedback and cross-referencing against MVP requirements.

### SY1: Merchant system is entirely absent despite being ~40% of MVP requirements

**Severity**: Critical
**Affects**: R21-R26, R30, R52-R58

The merchant character is the coordination hub of the bot system. Per architecture, it:
- Calculates and publishes party stats (tank, DPS)
- Monitors hunter supply needs and initiates resupply
- Manages gold, banking, NPC selling
- Evaluates farm targets for party capability
- Delivers gear improvements
- Directs hunter objectives via CM

None of this is implemented. The merchant boots, joins the party, publishes status, and idles permanently. This means:
- Hunters never get resupplied (they run out of potions and die or become ineffective)
- No gold management (gold accumulates on hunters with no banking)
- No gear improvement (items sit in inventory)
- No farm target optimization (party farms whatever was configured at boot, even if too hard)
- Party stats depend on merchant calculation but merchant calculates from an empty/stale view

This is not a single missing feature — it's the absence of an entire character role that ~40% of MVP requirements depend on.

### SY2: CM message handlers are plumbing without wiring

**Severity**: High
**Affects**: R8, merchant-hunter coordination

The CM protocol is well-designed: typed envelope format, sender validation, message routing. But every handler except `status-request` is a no-op that logs and discards:

| CM Type | Handler Action |
|---------|---------------|
| `party-invite` | Logs only |
| `objective-directive` | Logs only — does not update farmTarget or objective |
| `status-request` | Works (triggers `publishStatus()`) |
| `emergency` | Logs only — does not trigger flee or regroup |

The bus/signal system exists (`ctx.bus`) but is not used to bridge CM receipt into system reactions. For example, receiving an `objective-directive` should emit a bus event that the objective system listens for, triggering re-evaluation with the new farm target. This was a stated design intent across multiple interviews.

**Corrective action**: Wire CM handlers to produce actionable system responses:
1. `objective-directive` → update `ctx.config.farmTarget` → emit `config:farm-target-changed` → objective re-evaluates
2. `emergency` → set flee flag or trigger movement mode change via bus event
3. Future: `supply-request`, `hunt-eval-request` etc. wire into merchant objective evaluation

### SY3: Recurring pattern of documented-but-unimplemented features

**Severity**: Process concern

Several features have been documented across intent, requirements, and contracts through multiple review cycles but repeatedly fail to make it into implementation:

| Feature | Documentation Rounds | Status |
|---------|---------------------|--------|
| `respawn()` call | Intent, requirements, contracts | Never implemented (3rd round) |
| Merchant strategy | Intent, requirements, contracts, architecture | Stub only |
| Travel sync (R51) | Intent, requirements, contracts | Infrastructure only |
| CM directive handling | Intent, contracts | Handler exists but is no-op |
| Phase 4 utility functions | Contracts, architecture infrastructure | Stubs that throw |

This pattern suggests that the implementation agent may be treating "document the interface" as equivalent to "implement the behavior." The M1 documentation chain (requirements -> contracts -> implementation) is working for documentation production but the final link (implementation that satisfies contracts) is not being reliably completed.

### SY4: Party information lifecycle has a cold-start gap

**Severity**: Medium
**Affects**: Tank identification, party DPS, farmability assessment

The party information flow is:
1. Each character boots and publishes status to localStorage
2. Merchant reads all status snapshots and calculates party stats (tank, DPS)
3. Merchant writes to `al_bot:party:stats`
4. All characters read and populate `ctx.party`

But:
- At boot, no status snapshots exist yet → merchant calculates from nothing
- Characters booting before the merchant have no party stats
- If the merchant boots last, there's a window where hunters operate without party context
- There's no "all characters online" signal to trigger the first complete party evaluation

**Corrective action**: Accept that party stats are eventually consistent. Systems depending on `ctx.party.tank` or `ctx.party.basic_dps` must handle null/zero gracefully. Document the expected stabilization window (one full party tick cycle after all characters are online). Consider having the party system re-publish an updated snapshot immediately after receiving party stats from localStorage.

---

## MVP Requirement Coverage

Comprehensive status of all "must" priority requirements:

### Satisfied

| Req | Name | Evidence |
|-----|------|----------|
| R1 | Reliable bootstrap | `src/boot.js` — clean entry point, all systems wired |
| R2 | Loop lifecycle | `src/scheduler.js` — start/stop/pause/resume |
| R5 | Structured world view | `src/world-model.js` — categorized entities (with B4 caveat) |
| R6 | Raw vs derived state | Architecture separates game globals from ctx |
| R7 | Party maintenance | `src/party.js` — auto-invite/accept (with B5 caveat) |
| R8 | Cross-char communication | CM protocol + localStorage (with SY2 caveat — plumbing only) |
| R9 | Movement abstraction | `src/movement.js` — strategy pattern |
| R10 | Travel vs repositioning | Movement modes: flee/combat/travel/idle |
| R11 | Priority targeting | `src/targeting.js` — tiered priority chain |
| R12 | Class-aware combat | Melee/ranged/heal strategies |
| R15 | Separated intent/execution | Objective -> targeting -> attack pipeline |
| R16 | Universal + role states | ctx.objective with role field |
| R17 | Structured logging | `src/logging.js` — levels, buffer, snapshots |
| R19 | Centralized config | `src/configuration.js` |

### Partially Satisfied

| Req | Name | Status | Gap |
|-----|------|--------|-----|
| R4 | State recovery | Config reads localStorage at boot | No periodic persistence, no recovery flag, no objective persistence |
| R13 | HP/MP recovery | Potion-regen system works | Priority inversion (B2), async edge case (W2) |
| R21 | Inventory awareness | Utility functions exist | Not integrated into any decision system |
| R22 | Equipment upgrade ID | `isUpgrade()` exists | No multi-slot comparison, not used by any system |
| R23 | Hunter supply monitoring | Status snapshots include potion counts | No merchant reads/acts on the data |
| R30 | Party-capable targeting | `canFight()` exists | Never called; objective doesn't check capability |
| R35 | Monster danger/reward | `getFarmabilityData()` exists | Never called; assessment not integrated |
| R40 | Class skills/conditions | Priest/Paladin strategies | No condition detection, no other class strategies |
| R52 | Merchant stand mgmt | Movement closes/opens stand | No merchant workflow integration |

### Not Satisfied (MVP "must")

| Req | Name | Evidence |
|-----|------|----------|
| R3 | Death recovery | **B1** — no respawn() call |
| R24 | Field resupply | **B7** — no merchant resupply workflow |
| R26 | Upgrade/compound | **B7** — no workflow implementation |
| R33 | Map points of interest | No NPC location data, no queryable location system |
| R34 | Map transitions/NPC nav | Generic smart_move only, no NPC interaction |
| R37 | Monster hunt participation | No hunt acceptance, storage, or turn-in logic |
| R51 | Party travel sync | **B6** — infrastructure only, no speed sync |
| R53 | NPC selling | **B7** — stub throws |
| R54 | Gold management | **B7** — stub throws |
| R55 | Trade-slot resupply | **B7** — no trade logic |
| R56 | Hunter gear delivery | **B7** — no catalogue, no delivery |
| R58 | Bank operations | **B7** — stub throws |

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
- `G.base_gold` confirmed as valid game data (update `docs/game-api.md` to document it)
- `character.friends` confirmed as valid game feature (update `docs/game-api.md` unverified section)

**Exception**: B5 (`accept_party_request` vs `accept_party_invite`)

### Standards Adherence

- File-level doc comments: Present on all files. Good.
- JSDoc on exports: Present on most exports. One orphaned JSDoc in combat-skills.js (manually addressed).
- Error handling: Consistent try/catch in tick functions. W5 notes empty catch blocks.
- `const`/`let` usage: Consistent, no `var`. Good.
- Factory functions and plain objects: Consistent, no class hierarchies. Good.
- State management: localStorage keys are prefixed and documented. Good.

---

## Resolution Priority

### Immediate (blocks basic operation)
1. **B1** (respawn) — Bot permanently dead on first death
2. **B2** (potion priority) — MP starvation degrades all combat effectiveness
3. **B4** (solo party members) — Cascading misclassification through downstream systems
4. **B5** (party request accept) — Party formation fails

### High (blocks MVP completeness)
5. **B7** (merchant strategy) — ~40% of MVP requirements unsatisfied
6. **B6** (travel sync) — MVP must requirement
7. **B3** (isFriendly DRY) — Correctness risk across systems
8. **W1** (execution ordering) — Add initial population and tick guards
9. **W3/SY2** (merchant coordination) — Wire CM handlers to produce actions

### Medium (quality and correctness)
10. **W2** (async race) — Add in-flight guard
11. **W4** (context-map) — Update documentation
12. **W5** (empty catches) — Add logging
13. **W6** (DPS design mismatch) — Decouple estimateDPS from canFight, use basic_dps consistently for MVP farmability
14. **W7** (easyMonsters max_hp) — Simple fix
15. **W8** (state persistence) — Add periodic timer

### Documentation updates
- Update `docs/game-api.md`: add `G.base_gold`, move `character.friends` from unverified to verified
- Update `docs/architecture/context-map.md`: fix execution order, document eventual-consistency model for party stats
