# Implementation Review — v0.1.1

**Date**: 2026-04-10
**Scope**: Full implementation review of all src/*.js against documented contracts, intent, requirements, architecture, and game API reference
**Branch**: v0.1.0
**Commit**: 8698a2a
**Prior review**: `docs/review/implementation-review-v0.1.0.md`
**Reviewer**: Claude (implementation-review)

---

## Summary

v0.1.1 is a substantial improvement over v0.1.0. All 7 original blockers have been addressed — most fully resolved, with one partially resolved (travel sync applies the data model but not the actual speed constraint). The merchant strategy has moved from a non-functional stub to a multi-step workflow system with restock, sell, upgrade, compound, and trade-fulfill objectives. Infrastructure improvements include objective state persistence/recovery, periodic config reload, consolidated `isFriendly` utility, initial synchronous context population, and potion async-safety.

However, the merchant implementation introduces several new issues: incorrect game API usage for player-to-player trades, missing step handlers in workflows, async step execution without sequencing, a gold baseline calculation that can never grow, and an incomplete inventory protection list for NPC selling. Additionally, travel sync writes coordination data but movement never applies the speed constraint, and combat skills are unnecessarily gated on having an attack target (blocking priest partyheal when only a heal target exists).

**Finding counts**: 6 blockers, 7 warnings, 4 suggestions

---

## v0.1.0 Finding Resolution Status

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| B1 | Missing respawn | **Resolved** | `objective.js:84-94` — calls `respawn()` after 15s delay, both hunter and merchant strategies |
| B2 | Potion priority inversion | **Resolved** | `potion-regen.js:118-129` — urgency-based comparison, MP wins ties |
| B3 | isFriendly 3x definition | **Resolved** | Consolidated in `utils.js:385-392`, `world-model.js:11` imports from utils |
| B4 | Null-guard failures | **Resolved** | Optional chaining throughout; `parent.next_skill?.use_hp`, `location?.coord?.map`, `get_party() || {}` |
| B5 | Party request wrong API | **Resolved** | `party.js:347-353` — separate `handlePartyRequest` calling `accept_party_request(name)` |
| B6 | Travel sync not implemented | **Partial** | Data written (`party.js:146-177`) and read (`movement.js:304-309`) but **speed never applied** — see W1 below |
| B7 | Merchant strategy missing | **Substantially resolved** | Full multi-step workflows with new issues — see B1-B4 below |
| W1 | No execution ordering | **Resolved** | `boot.js:104-108` — initial synchronous tick for all context writers |
| W2 | Potion async race | **Resolved** | `potion-regen.js:88` — `potionInFlight` flag with `.finally()` cleanup |
| W3 | farmTarget not dynamic | **Resolved** | `objective.js:626-629` reloads config every ~10s; `party.js:317-322` CM handler updates farmTarget |
| W4 | Context-map vs boot.js | Not addressed | Documentation update still needed |
| W5 | Empty catch blocks | **Improved** | Most catches now log; a few silent catches remain |
| W6 | DPS/TTK model conflation | **Resolved** | `utils.js:244-286` — `estimateDPS` returns `{basic_dps}`, consistent model |
| W7 | easyMonsters uses hp | **Resolved** | `world-model.js:83` — `e.max_hp < character.attack * 0.8` |
| W8 | State persistence incomplete | **Resolved** | `objective.js:591-616` recovery on boot, `670-678` persists every 5 minutes |
| S1 | Merchant targeting | Not addressed | Merchant still runs with empty targeting strategies |
| SY1 | Merchant ~40% missing | **Substantially resolved** | Multi-step workflows implemented, gaps noted in new findings |
| SY2 | CM handlers are no-ops | **Partially resolved** | `objective-directive` now wires to farmTarget update; `emergency` still log-only |
| SY3 | Documented-but-unimplemented | **Improved** | respawn, merchant strategy, travel sync data, state persistence all implemented |
| SY4 | Cold-start gap | **Partially resolved** | `party.js:186-188` — local tank fallback when no merchant stats available |

---

## New Findings

### Blockers

#### B1: `trade_buy()` called as `buy()` — wrong game API function for player trade slots

**Files**: `src/objective.js:524`
**Contract**: `docs/contracts/objective.md` — trade-fulfill workflow
**Requirement**: R55 — trade-slot resupply

```javascript
case 'buy-items':
  for (const t of traders) {
    if (t.name === current.target && t.slots) {
      for (const slot in t.slots) {
        if (slot.includes('trade') && t.slots[slot]) {
          try { buy(t.slots[slot].name, 1); } catch (e) { /* best effort */ }
        }
      }
    }
  }
```

`buy()` is the NPC vendor purchase function. Buying from another player's trade slots requires `trade_buy(target, trade_slot, quantity)` where `target` is the entity object reference and `trade_slot` is the slot key name (e.g., `"trade1"`).

**Server reference** (`runner_functions.js:600`):
```javascript
function trade_buy(target, trade_slot, quantity) {
  return parent.trade_buy(trade_slot, target.id, target.slots[trade_slot].rid, quantity || 1);
}
```

The `.rid` property is used to prevent swap fraud — this is critical for trade integrity.

**Corrective action**: Replace `buy(t.slots[slot].name, 1)` with `trade_buy(t, slot)`. The entity object `t` is already available from the trader iteration. Add `trade_buy` to `docs/game-api.md`.

---

#### B2: Merchant multi-step workflow executes async operations synchronously

**Files**: `src/objective.js:345-357`, `objective.js:420-448`
**Contract**: `docs/contracts/objective.md` — Multi-Step Progression

`advanceStep()` calls `executeMerchantStep()` synchronously, but several steps contain async operations:

| Step | Async Call | Problem |
|------|-----------|---------|
| `withdraw` | `retrieveItem().catch(...)` | Fire-and-forget; step advances before items arrive |
| `buy-potions` | `buyItem().catch(...)` | Same — next step proceeds before purchase completes |
| `deposit` | `depositJunk().catch(...)` | Gold deposit and item storage incomplete when advancing |
| `execute-upgrade` | `upgrade(i, j).catch(...)` | Upgrade result unknown; next step may see stale inventory |
| `execute-compound` | `compound(...).catch(...)` | Same |

The workflow is:
1. `evaluate()` detects `stepComplete === true`
2. Objective calls `advanceStep()`
3. `advanceStep()` calls `executeMerchantStep()` — async operations fire
4. `advanceStep()` returns the next step immediately
5. Next tick: `evaluate()` may detect next step's completion condition before prior step's async work finishes

**Impact**: The `withdraw` step fires `retrieveItem()` and immediately advances to `buy-potions`. The buy step checks `countItem()` before the retrieval promise resolves, seeing pre-withdrawal inventory. The merchant buys full deficit quantities even when bank had sufficient stock. This doubles expenditure and wastes gold.

**Corrective action**: Two viable approaches:
1. **Await in step execution**: Make `executeMerchantStep` async, `advanceStep` async, and have the objective system handle the promise (don't advance until resolved)
2. **Guard-based progression**: Don't advance on `stepComplete` alone. Add per-step completion guards (e.g., `buy-potions` doesn't complete until `countItem >= needed`, `withdraw` doesn't complete until inventory changes)

Option 2 is more resilient to network latency and aligns with the stateless-tick model — each tick re-checks real state rather than trusting a promise resolved.

---

#### B3: Gold baseline growth calculation always produces zero surplus

**Files**: `src/objective.js:484-500`
**Contract**: `docs/contracts/objective.md` — Gold Baseline (R54)
**Requirement**: R54 — gold management strategy

The restock workflow step order is:
```
check-needs → travel-to-bank → withdraw → buy-potions → travel-to-party → deliver → collect-junk → travel-to-bank → deposit → check-baseline
```

The `deposit` step (line 462) calls `depositJunk(baseline, ...)` which deposits gold exceeding the baseline:
```javascript
if (character.gold > goldThreshold) {
  bank_deposit(character.gold - goldThreshold);
}
```

After deposit, `character.gold ≈ baseline`. Then `check-baseline` calculates surplus:
```javascript
const surplus = character.gold - baseline;  // ≈ 0 after deposit
if (surplus > 0) {
  const growth = Math.floor(surplus * 0.1);  // 0
  // baseline never grows
}
```

The surplus is always ≈0 because deposit runs before baseline check in the same workflow. The baseline can only grow if the merchant accumulates gold between restock cycles and check-baseline runs before deposit — but the step sequence prevents this.

**Corrective action**: Either:
1. Move `check-baseline` before `deposit` in the step sequence so surplus is calculated from pre-deposit gold
2. Calculate surplus from total gold (character.gold + bank gold) rather than just on-hand gold
3. Track gold received from hunters during the `collect-junk` step and use that as the growth input

Option 1 is the simplest fix. Reorder: `...collect-junk → travel-to-bank → check-baseline → deposit`.

**User Notes**:
- baseline should grow based on gold gathered from hunters NOT total gold at a moment; this was not the growth strategy intent. During restock when merchant travels to hunters to deliver potions, gather inventory overflow, and collect gold gathered from hunting merchant should evaluate amount of gold in inventory before collecting from hunters and then after collecting from hunters; this difference is hunting profit. 10% of this profit should be added onto the gold baseline value stored in localStorage to increase the baseline. This allows for dipping below the baseline for hunter sustainment and purchasing upgrades (intent) while ensuring that merchant can only run lossy sales program while current total gold amount is above baseline.
---

#### B4: Potion tier fallback iterates strongest-to-weakest, violating contract

**Files**: `src/potion-regen.js:200-212`
**Contract**: `docs/contracts/potion-regen.md` — Potion Inventory Management

```javascript
// Desired tier unavailable — fallback to next available tier (strongest to weakest)
for (const name of potionNames) {
  if (findPotionSlot(items, name) >= 0) { ... }
}
```

`potionNames` is derived from `getHpPotions().map(p => p.name)` which is sorted **descending by restoration value** (strongest first). When the desired tier isn't available, the loop tries `hpotx` (strongest) before `hpot0` (weakest).

**Contract** (from pre-implementation review resolution M6): "Fallback to lower tier only, then regen. Never higher tier."

**Intent** (`docs/intent/sustain.md`): Economy priority — prefer cheaper potions to preserve gold.

**Impact**: When a mid-tier potion is selected but unavailable, the system falls back to the most expensive potion first, wasting gold. This directly contradicts the documented economy-first recovery model.

**Corrective action**: After the desired potion isn't found, iterate the potion list from the desired tier's position **downward** (toward weaker/cheaper tiers). If no lower tier is available, fall back to regen — never to a higher tier.

```javascript
// Find desired tier's index and iterate downward
const desiredIdx = potionNames.indexOf(desiredPotion);
for (let i = desiredIdx + 1; i < potionNames.length; i++) { // weaker tiers only
  if (findPotionSlot(items, potionNames[i]) >= 0) { ... }
}
// No lower tier → use regen
```

Note: This requires `potionNames` to be sorted strongest-to-weakest (which it already is), and the loop starts AFTER the desired tier.

---

#### B5: `collect-junk` step handler missing from merchant workflow

**Files**: `src/objective.js:391-575`
**Contract**: `docs/contracts/objective.md` — restock multi-step workflow

The restock workflow (`MERCHANT_STEPS.restock`) includes `'collect-junk'` at index 6:
```javascript
restock: ['check-needs', 'travel-to-bank', 'withdraw', 'buy-potions',
          'travel-to-party', 'deliver', 'collect-junk', 'travel-to-bank', 'deposit', 'check-baseline'],
```

But `executeMerchantStep` has no `case 'collect-junk':` in the switch statement. The step falls through to the default case (implicit end of switch), executing nothing.

**Impact**: The merchant never collects loot/junk from hunters during resupply. Hunters accumulate items with no offloading, filling their inventory and triggering needsResupply repeatedly. The resupply loop becomes infinite: restock → deliver → collect nothing → restock...

**Corrective action**: Add a `collect-junk` step handler that uses trade mechanics to receive items from nearby hunters, or at minimum marks the step as acknowledged so the workflow can progress meaningfully. The actual collection mechanism depends on how the game handles item transfer (likely `trade_buy` on hunter's trade slots listing junk at 1g).

**User Notes**: Hunters need to send their items to the trader (check previous implementations). I believe simplest mechanic (that aligns to design/architecture) is having a trade strategy that is implemented/executed alongside attack/heal/skills. For merchant this will be evaluating ability to fulfill trade requests, for non-merchants this will be sending gold/junk to player's merchant if they are nearby.

---

#### B6: Incomplete keepList causes merchant to sell MP potions and useful items to NPC

**Files**: `src/objective.js:326,504`, `src/utils.js:542-555`
**Contract**: `docs/contracts/objective.md` — NPC selling (R53)
**Requirement**: R53, R59

The keep list for `findSellableItems` is derived from restock thresholds:
```javascript
const sellable = findSellableItems(
  Object.keys(ctx.config.restockThresholds?.potionsPerHunter || {})
);
// Result: keepList = ['hpot0', 'hpot1']
```

This means the following items are **not protected** and will be sold:
- `mpot0`, `mpot1` — MP potions (critical for merchant operations)
- `scroll0`, `cscroll0` — upgrade/compound scrolls (needed for R26 workflows)
- `tracker` — tracker device (R59 progression mechanic)
- Any potions the merchant is carrying for delivery
- Any gear being transported for hunter delivery (R56)

`findSellableItems` only excludes the keepList, quest items (`gItem.quest`), and event items (`gItem.e`). Everything else is sold.

**Impact**: The merchant sells its own MP potions, upgrade scrolls, and gear meant for hunters. This directly sabotages the upgrade, compound, and resupply workflows.

**Corrective action**: Build a comprehensive keep list:
1. All potion types (HP and MP, all tiers)
2. Upgrade and compound scrolls (`scroll0`, `cscroll0`, and higher grades)
3. Items flagged for hunter delivery (from gear requests)
4. Tracker device
5. Any items the merchant needs for current workflow (e.g., items being upgraded)

Consider centralizing the keep list in configuration rather than deriving it inline.

**User Notes**: this is prone to failure. Corrective action is determining and tracking the intended for sale list and selling those items explicitly. Sell all is bad approach, MUST NOT be implemented in this fashion; sell explicit is the intent.

---

### Warnings

#### W1: Travel sync writes data but movement never applies speed constraint

**Files**: `src/party.js:146-177`, `src/movement.js:304-309`
**Contract**: `docs/contracts/movement.md` — Party Travel Sync (R51)
**Requirement**: R51 — party travel sync (must)

Party writes `travelSync` to localStorage with `slowestSpeed` and `active` flag. Movement reads and stores it in `ctx.party.travelSync`. But `tickTravel()` only **logs** the constraint:

```javascript
const travelSync = ctx.party?.travelSync;
if (travelSync?.active && travelSync.slowestSpeed) {
  ctx.logger.info('movement', `Traveling to ... (synced speed: ${travelSync.slowestSpeed})`);
}
```

No actual speed capping occurs. `smart_move()` uses the character's native speed. Characters with higher speed arrive first, potentially facing hostile packs alone — the exact scenario R51 was designed to prevent.

**Corrective action**: The game doesn't expose a direct "set movement speed" API. For `smart_move()`, speed is determined server-side. Two approaches:
1. **Pacing via waypoints**: Break travel into short segments. After each segment, wait for slower members before proceeding.
2. **Delayed departure**: Calculate arrival time difference based on speed ratios. Faster characters delay departure proportionally.

Either approach requires more design work than a simple code fix. Document this as a known gap and consider whether paced travel is achievable within the `smart_move()` API constraints.


**User Notes**:
- The API function you are looking for is `cruise(target_speed)`, this can be used to set speed to slowest party member speed. `cruise(0)` will reset to full speed or `cruise(9999)` will reset as it caps to character's actual max speed.
---

#### W2: Combat skills gated on `attackTarget`, blocking priest partyheal

**Files**: `src/combat-skills.js:100`
**Contract**: `docs/contracts/combat-skills.md` — Tick sequence step 2

```javascript
if (!ctx.targeting?.attackTarget) return { delay: 1000 };
```

If the priest has a `healTarget` but no `attackTarget` (e.g., party taking environmental damage, or priest arrived at farm zone before monsters), `partyheal` is blocked. The priest won't use party heal even when multiple party members are below 80% HP.

**Contract says**: "Target check: If attackTarget null, return `{ delay: 1000 }`" — the implementation matches the contract. But the contract itself is underspecified: combat skills for priest include `partyheal`, which is a healing skill triggered by party health state, not by having an attack target.

**Corrective action**: Change the gate to check for either target:
```javascript
if (!ctx.targeting?.attackTarget && !ctx.targeting?.healTarget) return { delay: 1000 };
```
Update the combat-skills contract to match: "If no attackTarget and no healTarget, return idle delay."

**User Notes** This sounds like improper skill employment. Attack and heal share a skill cooldown so those are competing strategies. Skills largely have their own cooldown so use of attack/heal should not impact skill use. Individual skills may need an attack target specified or entity monitoring to be populated but that should be for the skill handler to decide/gate not calling the skill handler

---

#### W3: `deliver` step is a no-op — no actual item transfer

**Files**: `src/objective.js:452-455`
**Contract**: `docs/contracts/objective.md` — restock deliver step

```javascript
case 'deliver':
  ctx.logger.info('objective', `Delivering supplies to ${current.target}`);
  // Trade API interaction — send items to nearby hunter
  // For MVP: items are available, hunter picks up via trade slots (R55)
  break;
```

The step logs intent but performs no action. The comment references R55 (trade-slot resupply) as the delivery mechanism, but:
- Hunters post **needs** in their trade slots
- The merchant should fulfill those trade slots using `trade_buy`
- Or the merchant should list items for sale in its own trade slots for the hunter to buy

Without an actual transfer mechanism, potions bought in `buy-potions` sit in the merchant's inventory indefinitely. The restock workflow completes without any supplies reaching hunters.

**Corrective action**: Implement the deliver step using one of:
1. Merchant lists supply items in trade slots at 1g; hunter buys during next tick (requires hunter-side trade fulfillment logic)
2. Merchant uses `trade_buy` on hunter's trade slots to fulfill posted requests directly
3. Merchant uses `send_cm` to notify hunter of available supplies, then handles via proximity-based trade

Option 2 aligns with R55's design: "Hunters list needed items in trade slots at 1g/item. Merchant fulfills own characters' trade requests when nearby without price evaluation."

---

#### W4: Merchant `evaluate()` calls `openStand()` every tick when idle

**Files**: `src/objective.js:338-339`
**Contract**: `docs/contracts/objective.md` — Objective invariants

```javascript
if (current.type !== 'idle') {
  openStand();
  return { type: 'idle', ... };
}
```

This calls `openStand()` on every transition to idle (correct). But the condition `current.type !== 'idle'` means it only fires on the transition tick. However, if the stand gets closed externally (e.g., by movement system closing it before repositioning, then returning to idle), the stand won't reopen until a non-idle → idle transition occurs.

Additionally, the `open_stand()` game API call is in the evaluate function. Per contract: "Never calls attack/heal/move/smart_move directly. May call utility functions for game interactions during merchant steps." Opening stand in evaluate (not a step) is a grey area. Evaluate should be a pure decision function.

**Corrective action**: Move stand management to a dedicated idle tick check rather than embedding it in the objective evaluation. The movement system already handles close-before-move; a symmetric open-when-idle check in movement (or a separate idle-state handler) would be cleaner.

**User Notes**: This sounds like a deviation from stated intent with prior session. Stand management interactions may occur in multiple systems; however the only current contract is with the movement system, such that it should ensure that stands are closed prior to initiating a move and that when a merchant completes a move its stand is reopened. The movement system as whole may require a focused session for redesign/better employment however as a error item this deficiency can still be corrected now.

---

#### W5: `restockThresholds` missing MP potion entries

**Files**: `src/configuration.js:39-41`
**Contract**: `docs/contracts/configuration.md` — Config Shape
**Requirement**: R13, R23

```javascript
restockThresholds: {
  potionsPerHunter: { hpot0: 100, hpot1: 20 },
},
```

No MP potion thresholds. Consequences:
1. `needsResupply` (party.js:254-259) never triggers for MP depletion
2. Merchant `check-needs` (objective.js:396-413) calculates zero MP deficit
3. Merchant never buys or delivers MP potions
4. Hunters run out of MP and can't attack (per intent: "mp is required even for basic attacks")

**Corrective action**: Add MP potion thresholds:
```javascript
potionsPerHunter: { hpot0: 100, hpot1: 50, mpot0: 100, mpot1: 50 },
```

---

#### W6: `needsResupply` triggers on inventory fullness, not supply state

**Files**: `src/party.js:285`
**Contract**: `docs/contracts/party.md` — Status Publishing (R23)
**Requirement**: R25

```javascript
needsResupply: potionLow || emptySlots < character.items.length * 0.5,
```

The second condition fires when inventory is over 50% full, regardless of what's in it. A hunter with 25 equipped/quest items and 5 potions has 12 empty slots out of 42 — that's 71% full, triggering `needsResupply` even with adequate potion supply. This causes the merchant to run resupply loops that deliver nothing useful.

R25 baseline: "MVP is a simple boolean resupply-needed flag published in status snapshot (potions < 50% target levels OR inventory > 50% full)." The requirement includes inventory fullness, so this is technically correct — but the intent is to flag when there's too much junk, not when the character has normal equipment.

**Corrective action**: Consider making the inventory fullness check more specific: count items that aren't equipment, potions, or keep-list items. Or separate "needs potion restock" from "needs junk collection" as distinct flags in the status snapshot so the merchant can respond appropriately.

**User Notes**: resupply runs are to deliver any needed potions/upgraded gear and to collect inventory overflow. Equipped items do not show in inventory; they are in character equipment slots not inventory slots. So the only thing to count/evaluate is `character.items` to evaluate how full their inventory is.

---

#### W7: Status snapshot missing `attack` and `frequency` for non-merchant characters

**Files**: `src/party.js:265-266`
**Contract**: `docs/contracts/party.md` — Status Publishing shape

The snapshot includes `attack` and `frequency`:
```javascript
attack: character.attack,
frequency: character.frequency,
```

This is correct — both fields are present. However, the party stats calculation at `party.js:127` reads these:
```javascript
if (snap.attack && snap.frequency) {
  totalDps += snap.attack * snap.frequency;
}
```

If either is 0 (which shouldn't happen for combat characters but could for merchants), the check `snap.attack && 0` would be falsy, excluding the character from DPS. Since the merchant is excluded from combat DPS anyway (and merchants have attack stats from their character), this is a minor edge case.

**More significant**: The merchant includes its own DPS in the party total (`party.js:111-112` starts with merchant's own stats, then adds from snapshots). Merchant DPS is irrelevant to combat capability assessment. This inflates `basic_dps` used by `canFight()`.

**Corrective action**: Exclude the merchant from party DPS calculation. The merchant's combat stats don't contribute to farming capability.

---

### Suggestions

#### S1: `executeMerchantStep` closure parameter shadowing

**Files**: `src/objective.js:391`

```javascript
function executeMerchantStep(ctx, current, needs) {
```

The `needs` parameter is never referenced — the function body uses the closure variable `restockNeeds` directly (e.g., line 421). Both resolve to the same value since `advanceStep` passes `restockNeeds` as the argument. This is correct but confusing.

**Suggestion**: Remove the `needs` parameter and document the closure dependency, or use the parameter consistently instead of the closure.

---

#### S2: `findMonsterLocation` returns first map match — may be suboptimal

**Files**: `src/objective.js:23-56`

The function iterates `G.maps` and returns the first pack matching the monster type. Object iteration order in modern JS follows insertion order, which for game data may not correspond to optimal farming location (e.g., a monster type may spawn on both `main` and a dungeon map with different pack sizes or gold rates).

**Suggestion**: For MVP this is acceptable. Future iteration could score locations by pack size, gold rate (`G.base_gold`), or proximity to NPCs.

---

#### S3: Farmability assessment (`canFight`, `getFarmabilityData`) still not integrated

**Files**: `src/utils.js:273-316`, `src/objective.js`
**Requirements**: R30, R35

These functions were restructured per W6 from v0.1.0 and are now correctly designed. However, they remain unused — the hunter strategy farms whatever `farmTarget` is configured without checking party capability. The merchant doesn't use `canFight` to evaluate hunt viability (R37).

**Suggestion**: Wire `canFight()` into the hunter strategy as a guard: if `canFight(farmTarget, partyDPS)` returns false, idle instead of farming. Wire into merchant's hunt evaluation for R37. This is a quality-of-life improvement, not a blocker — the user can manually set appropriate farm targets.

---

#### S4: Emergency CM handler remains a no-op

**Files**: `src/party.js:332-333`
**Contract**: `docs/contracts/party.md` — CM Message Protocol

```javascript
case 'emergency':
  ctx.logger.warn('party', `emergency from ${sender}: ${data.data?.type}`);
  break;
```

Emergency signals could trigger movement flee mode or objective recover state. Currently log-only.

**Suggestion**: Emit a bus event (e.g., `party:emergency`) that movement could listen for to trigger flee mode. Low priority — the flee detection based on HP and targets covers the most critical survival scenario.

---

## System-by-System Assessment

### Infrastructure (Phase 0-1)

| System | Contract Conformance | Quality | Growth Readiness |
|--------|---------------------|---------|-----------------|
| **Scheduler** | Full | Solid. Clean setTimeout chains, adaptive delays, error isolation. | Extensible via register(). |
| **Event Bus** | Full | Clean pub/sub. Proper error isolation per handler. | Signal catalog may need expansion. |
| **World Model** | Full | Two-pass hostile resolution is correct. `isFriendly` consolidated. | Entity categories extensible. |
| **Configuration** | Full | Static/dynamic split correct. Reload mechanism works. | Threshold expansion straightforward. |
| **Logging** | Full | Level filtering, ring buffer, snapshots all working. | Per-system levels useful for debugging. |

**Infrastructure verdict**: Solid foundation. All Phase 0-1 systems conform to contracts and support dependent systems correctly. The initial synchronous population (boot.js:104-108) ensures readers see real data on their first tick.

### Combat Systems (Phase 2)

| System | Contract Conformance | Quality | Growth Readiness |
|--------|---------------------|---------|-----------------|
| **Targeting** | Full | Tiered priority with sticky targeting and dedup. Clean strategy composition. | Strategy interface extensible. |
| **Attack** | Full | Thin cooldown-gated executor. Correct heal priority. Adaptive delays. | Minimal — by design. |
| **Combat Skills** | Partial (W2) | Gate blocks partyheal. Priest and paladin strategies work otherwise. | Strategy interface ready for more classes. |
| **Potion/Regen** | Partial (B4) | Async safety added. Priority model correct. Tier fallback direction wrong. | Potion list extensible via G.items. |
| **Movement** | Partial (W1) | Mode detection clean. Kite algorithm well-designed. Stand management correct. | Travel sync data present, speed cap missing. |

**Combat verdict**: The targeting → attack → combat-skills decomposition is clean and well-separated. The kite algorithm (movement.js:70-135) is the most sophisticated piece of game-mechanical code and correctly implements ±90° steering with `can_move_to` validation. Remaining issues are specific (potion fallback direction, combat-skills gate, travel sync speed).

### Coordination Systems (Phase 3)

| System | Contract Conformance | Quality | Growth Readiness |
|--------|---------------------|---------|-----------------|
| **Objective (Hunter)** | Full | Respawn implemented. Travel/farm transitions correct. Config reload working. | State persistence enables recovery. |
| **Objective (Merchant)** | Partial (B1-B6) | Workflow structure sound. Step execution has async, API, and logic errors. | Multi-step framework is extensible — fix step implementations. |
| **Party** | Mostly | Assembly, status, CM all functional. Tank/DPS from localStorage. Travel sync writes. | CM protocol ready for new message types. |

**Coordination verdict**: The hunter path (objective → targeting → attack → movement) is functional end-to-end. The merchant path has the workflow framework but needs step execution fixes before it's operational. The party system provides the cross-character plumbing that both strategies need.

### Utilities

| Utility | Quality | Notes |
|---------|---------|-------|
| **Inventory** (findItemSlots, countItem, catalogInventory) | Good | Correct item model handling with q/stacking |
| **Equipment** (isUpgrade, getSlotForItem, getClassWeaponTypes) | Good | MVP comparison (name + level) correct |
| **Movement** (nearLocation, vectors) | Good | Correct distance/vector math |
| **Farming** (estimateDPS, estimateTTK, canFight, getFarmabilityData) | Good | Consistent basic_dps model, dormant armor code correctly isolated |
| **Stand** (openStand, closeStand, isStandOpen) | Good | Thin wrappers, correct |
| **Bank** (depositItems, retrieveItem, depositJunk) | Good | Correct async handling, proper error boundaries |
| **Vendor** (buyItem, sellItem, findSellableItems) | Partial (B6) | sellItem/buyItem correct; findSellableItems keepList incomplete |
| **Gold** (getGoldBaseline, updateGoldBaseline) | Good | Clean localStorage wrapper |
| **Party** (isFriendly, isFriendlyName) | Good | Consolidated, comprehensive checks |

---

## MVP Requirement Coverage

### Satisfied (no open issues)

| Req | Name | Evidence |
|-----|------|----------|
| R1 | Reliable bootstrap | `boot.js` — clean entry, initial sync population |
| R2 | Loop lifecycle | `scheduler.js` — start/stop/pause/resume |
| R3 | Death recovery | `objective.js:84-94` — respawn after 15s |
| R5 | Structured world view | `world-model.js` — categorized entities |
| R6 | Raw vs derived state | Architecture separates game globals from ctx |
| R7 | Party maintenance | `party.js` — auto-invite/accept, separate handlers |
| R8 | Cross-char communication | CM protocol + localStorage, farmTarget directive wired |
| R9 | Movement abstraction | `movement.js` — strategy pattern |
| R10 | Travel vs repositioning | Movement modes: flee/combat/travel/idle |
| R11 | Priority targeting | `targeting.js` — tiered priority chain |
| R12 | Class-aware combat | Melee/ranged/heal strategies + class skill strategies |
| R15 | Separated intent/execution | Objective → targeting → attack pipeline |
| R16 | Universal + role states | ctx.objective with role field |
| R17 | Structured logging | `logging.js` — levels, buffer, snapshots |
| R19 | Centralized config | `configuration.js` |
| R42 | Explicit responsibilities | Each system is a bounded module |
| R43 | No file-order deps | esbuild bundle, explicit imports |
| R44 | No silent failures | Error logging throughout, bus error capture |
| R46 | Shared state schema | localStorage keys documented, prefixed |
| R47 | Bounded loop ownership | Scheduler owns all loops |
| R48 | Centralized thresholds | Config.thresholds, config.toggles |
| R50 | Browser-native design | No host dependencies |

### Partially Satisfied

| Req | Name | Status | Gap |
|-----|------|--------|-----|
| R4 | State recovery | State persistence implemented | `recoveryEnabled` defaults to false; multi-step merchant workflows still vulnerable to reload mid-workflow (B2 async) |
| R13 | HP/MP recovery | Potion-regen system works | Tier fallback direction (B4) |
| R14 | Hostile player response | pvpDefense toggle and targeting tier | No emergency response wiring (S4) |
| R21 | Inventory awareness | Utilities exist, catalogue in localStorage | Incomplete keepList (B6) |
| R22 | Equipment upgrade ID | `isUpgrade()` and gear requests work | Multi-slot comparison for rings/earrings not implemented |
| R23 | Hunter supply monitoring | Status snapshots with potions, needsResupply | Missing MP thresholds (W5), noisy needsResupply (W6) |
| R24 | Field resupply | Workflow structure complete | Deliver step is no-op (W3), async execution (B2) |
| R26 | Upgrade/compound | Workflow steps + scroll/item lookup | Async execution (B2), no grade check verification |
| R30 | Party-capable targeting | `canFight()` exists | Not integrated into objective decisions (S3) |
| R35 | Monster danger/reward | `getFarmabilityData()` exists | Not integrated (S3) |
| R40 | Class skills/conditions | Priest/Paladin strategies | No condition detection, partyheal blocked without attackTarget (W2) |
| R51 | Party travel sync | Data model complete, writes/reads work | Speed not actually applied (W1) |
| R52 | Merchant stand mgmt | Movement closes/opens, idle opens | Stand open in evaluate, not a step handler (W4) |
| R53 | NPC selling | Workflow + `sellItem` utility | Incomplete keepList (B6) |
| R54 | Gold management | Baseline + surplus system | Surplus always 0 due to step ordering (B3) |
| R55 | Trade-slot resupply | Workflow + trade-fulfill objective | Wrong API function (B1) |
| R56 | Gear delivery | Catalogue + gear requests | No delivery mechanism (deliver step is no-op) |
| R58 | Bank operations | `depositItems`, `retrieveItem`, `depositJunk` | Async execution ordering (B2) |

### Not Satisfied (MVP must)

| Req | Name | Gap |
|-----|------|-----|
| R33 | Map points of interest | No queryable POI system; `findBankLocation`/`findPontyLocation` are hardcoded helpers, not a general solution |
| R34 | Map transitions/NPC nav | `smart_move` handles transitions, but no NPC interaction framework (only `interact("monsterhunt")` documented) |
| R37 | Monster hunt participation | No hunt acceptance, storage, evaluation, or turn-in logic |

---

## Cross-Cutting Observations

### Architecture and Design Patterns

The system composition is well-executed. The shared context (`ctx`) pattern with sole-writer ownership, the strategy pattern for behavioral variation, and the scheduler's independent tick loops create a clean, maintainable architecture. The factory-function-over-class approach is consistent and appropriate for the browser environment.

The merchant multi-step workflow framework (MERCHANT_STEPS + evaluate + advanceStep + executeMerchantStep) is well-designed architecturally — step sequences are declarative, travel vs action steps are distinguished, and the objective system handles progression generically. The problems are in individual step implementations, not in the framework.

### Game API Alignment

| API Usage | Status |
|-----------|--------|
| `attack()`, `heal()`, `can_attack()` | Correct |
| `use_skill()` for recovery and combat | Correct |
| `smart_move()`, `move()`, `stop()` | Correct |
| `loot()`, `get_chests()`, `change_target()` | Correct |
| `distance()`, `can_move_to()` | Correct |
| `send_cm()`, `on_cm` handler | Correct |
| `send_party_invite()`, `send_party_request()` | Correct |
| `accept_party_invite()`, `accept_party_request()` | Correct (separate handlers now) |
| `get_characters()`, `get_party()` | Correct |
| `swap()` — async handling | Correct |
| `bank_store()`, `bank_deposit()`, `bank_retrieve()` | Correct signatures |
| `upgrade()`, `compound()` | Correct signatures |
| `buy()`, `sell()` | Correct for NPC usage |
| **`buy()` for player trade** | **WRONG** — should be `trade_buy(target, slot)` (B1) |
| `open_stand()`, `close_stand()` | Correct |
| `respawn()` | Correct |
| `is_on_cooldown()`, `parent.next_skill` | Correct |

### Standards Adherence

- **Factory pattern**: Consistent across all 14 files. No class hierarchies.
- **Error handling**: try/catch in all tick functions. Most catches now log (improved from v0.1.0).
- **const/let**: Consistent, no `var`.
- **JSDoc**: Present on exports and significant internal functions.
- **localStorage keys**: Consistently prefixed with `al_bot:`.
- **DRY**: `isFriendly` consolidated. No other significant duplication detected.
- **Single responsibility**: Each file has a clear, bounded concern.

### Hallucination Risk Assessment

| Area | Risk | Evidence |
|------|------|----------|
| Game API function signatures | Low | Verified against server reference for all critical functions |
| `buy()` for player trades | **Confirmed hallucination** | `buy()` is NPC-only; `trade_buy()` is the player trade API |
| Monster spawn data model | Low | `G.maps[].monsters[].boundary` access matches server data structure |
| Cooldown groups | Low | Verified in v0.1.0 review and pre-implementation review |
| Bank API | Low | `bank_store(slot)` simple form matches server reference |
| Item model | Low | `name`, `level`, `q` properties verified |

---

## Resolution Priority

### Immediate (blocks merchant operation)

1. **B1** (trade_buy API) — Player trade slots cannot be fulfilled
2. **B2** (async step execution) — Bank/vendor operations race with step progression
3. **B6** (keepList incomplete) — Merchant sells its own supplies to NPC

### High (blocks correct merchant behavior)

4. **B3** (gold baseline) — Surplus growth permanently zero
5. **B4** (potion fallback direction) — Wastes gold on expensive potions
6. **B5** (collect-junk missing) — Hunters never offloaded; resupply loops
7. **W3** (deliver no-op) — Potions never reach hunters
8. **W5** (MP thresholds missing) — MP depletion invisible to merchant

### Medium (quality and correctness)

9. **W1** (travel sync speed) — Design gap; may need alternative approach
10. **W2** (combat-skills gate) — Priest partyheal blocked without attack target
11. **W4** (stand in evaluate) — Architectural purity; functional impact low
12. **W6** (needsResupply noise) — Causes unnecessary resupply trips
13. **W7** (merchant in party DPS) — Inflates farmability assessment

### Low (improvement opportunities)

14. **S1** (parameter shadowing) — Code clarity
15. **S2** (monster location selection) — Future optimization
16. **S3** (farmability integration) — Quality of life
17. **S4** (emergency CM) — Completeness

---

## Documentation Updates Needed

| Document | Update |
|----------|--------|
| `docs/game-api.md` | Add `trade_buy(target, trade_slot, quantity)` function |
| `docs/game-api.md` | Move `character.friends` from Unverified to verified |
| `docs/game-api.md` | Add `G.base_gold` to Other G Data table |
| `docs/architecture/context-map.md` | Fix execution order to match boot.js (party before targeting) |
| `docs/architecture/context-map.md` | Document eventual-consistency for party stats |
| `docs/contracts/combat-skills.md` | Update target gate to include healTarget |
| `docs/contracts/objective.md` | Document async step execution requirements |
| `docs/contracts/configuration.md` | Add MP potion thresholds to default config |
