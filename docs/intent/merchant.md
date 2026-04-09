# Intent: Merchant

Covers the merchant character's economy role: inventory management, banking, buying/selling, item improvement (upgrade/compound), field resupply, and trading. This is the largest gap between v2 and current implementation.

---

## Inventory Cataloging

- **What**: Scan all items in inventory and bank, classify by purpose (keep, sell, upgrade, compound, deliver)
- **MVP**: On entering idle/inv_mgmt state, scan character.items[] and character.bank. Build a catalog: potions (by tier and count), scrolls (by grade and count), equipment (by name, level, grade), junk (everything else). Track quantities and slot positions.
- **End-state**: Persistent catalog across sessions (localStorage). Track item acquisition rate. Detect item types needed by party (from wishlists/status snapshots). Smart classification — items above a certain value threshold are "keep", below are "sell".
- **Notes**: v2 and hyper-fixate both implement this. The catalog drives all merchant decisions (what to upgrade, what to sell, what to buy, when to restock).
- **Notes (additional)**: Catalog is merchant's own pool of active items for tasks (upgrade, compound, craft, purchase). Does not include hunter-held items — hunters manage their own gear requests via localStorage catalogue (see gear-progression.md). Catalog should be stored in localStorage for cross-session persistence.

## Junk Classification

- **What**: Identify items that should be sold to NPC or deposited in bank vs items to keep
- **MVP**: Configurable "keep list" — potions, stand, and tracker. Everything else is junk to transferred to merchant for proper storage, upgrade/compound, or sales. Use G.items[name] to check item properties.
- **End-state**: Value-based classification — items worth more than configurable threshold are kept for player trading. Items with upgrade/compound flag are evaluated for improvement potential before selling. Rare drops are always kept.
- **Notes**: 
  - Keep list for hunters: potions (hp/mp recovery), stand (expanded inventory via trade slots), tracker (must be in inventory for kill credit toward passive buffs). Everything else is offloaded to merchant.
  - "Junk" is relative to the character — items are junk to a hunter who only needs combat essentials, but valuable to the party for progression/storage/sale. Merchant receives and classifies appropriately.

## Bank Deposit Gold

- **What**: Travel to bank NPC, call `bank_deposit(gold)` to store gold safely
- **MVP**: Part of the banking workflow. After collecting loot from hunters, travel to bank and deposit excess gold (keep a working amount for purchases). Requires being at the bank map/NPC.
- **End-state**: Smart gold management — keep enough for expected purchases (potions, scrolls), deposit the rest. Track gold growth rate for metrics.
- **Notes**: v2 deposits all gold during depositJunkInBank(). Bank location: {x:0, y:-70, map:"bank"}. Game constraint: only 1 of a player's characters can be in the bank at any given time.
- **Gold management**: 
  - MVP: Merchant withdraws only what is needed to complete current task. Resupply/scroll cost can be pre-calculated.
  - Gold baseline target stored in localStorage. If not set, initialize to current total gold (bank + on merchant). After every resupply, increase baseline by ~10% of gold retrieved from hunters.
  - Baseline ramps over time toward 112,500,000 gold (most expensive bank slot upgrade).
  - Hunting profit allocation: potion restock → merchant XP (lossy trades) → baseline gold target growth.
  - Merchant can operate lossy sales only with gold exceeding baseline target.
  - End-state: keep working gold on hand for opportunistic deals from other players.

## Bank Store Items

- **What**: Store inventory items in bank vaults via `bank_store(slot)`
- **MVP**: Part of the banking workflow. Store all non-essential items (junk, overflow potions, collected loot) in bank. bank_store() auto-selects the best vault pack if not specified.
- **End-state**: Organized banking — scrolls in one pack, potions in another, equipment sorted by type/level. Track bank contents for quick retrieval.
- **Notes**: v2 calls bank_store() for each junk item during depositJunkInBank(). The game has multiple bank packs (items0-items17, bank_b sections).

## Bank Retrieve Items

- **What**: Get specific items from bank vault via `bank_retrieve(pack, slot)`
- **MVP**: Part of upgrade/compound workflow. Retrieve items earmarked for improvement. Retrieve scrolls for upgrade/compound operations.
- **End-state**: Smart retrieval — find the best item to upgrade/compound from bank catalog without linear scan. Batch retrieve for efficiency.
- **Notes**: v2 has retrieveItemFromBank() utility. Requires knowing which pack and slot the item is in — this comes from the bank catalog.

## NPC Buy Potions

- **What**: Purchase potions from NPC vendor via `buy(name, quantity)`
- **MVP**: Part of restock workflow. Buy potions when stock is low (below configurable threshold). Buy each tier the party needs. Travel to potion vendor, buy in bulk.
- **End-state**: Predict potion consumption rate from party combat metrics. Buy enough for expected farming duration plus safety margin. Prioritize HP potions over MP potions.
- **Notes**: v2 buys if <4000 of each tier. buy() requires being near the appropriate NPC vendor. Need to know which NPC sells potions and their location.
- **NPC vendors**:
  - Ernis: potions (-35, -142, mainland)
  - Lucas: scrolls (-464, -76, mainland)
  - Cue: upgrade/compound (-207, -200, mainland)
  - Ponty: only NPC that buys items (sells items for gold) — located in town
  - Must be within range of the specific NPC to interact. `buy()` does not auto-find vendors.
  - NPC vendors sell unique item sets (no duplicates across vendors, except Ponty who resells player items).
  - NPC positions can be resolved dynamically from G data.

## NPC Sell Items

- **What**: Sell items to NPC vendor via `sell(slot, quantity)`
- **MVP**: Part of merchant workflow. Sell classified for_sale items at NPC vendor. Travel to vendor, sell each for_sale item
- **End-state**: Sell strategy — sell common junk immediately, hold rare items for player trade (higher value). Track gold earned from sales for metrics.
- **Notes**: Ponty is the only NPC that buys items (exchanges items for gold). Travel to Ponty, sell each classified-for-sale item.

## Item Upgrade Workflow

- **What**: Complete upgrade cycle: select item, determine scroll grade, buy scroll, travel to upgrade NPC, execute upgrade, handle cooldown
- **MVP**: Merchant evaluates bank catalog for upgradeable items. Retrieves item from bank. Buys appropriate scroll via `buy(scroll_name)`. Travels to upgrade NPC. Calls `upgrade(item_slot, scroll_slot)`. Waits for cooldown (`character.q.upgrade.ms`). Evaluates result and decides whether to continue upgrading or move on.
- **End-state**: Expected value calculation before upgrading — is the upgrade worth the scroll cost? Track success/failure rates. Grace/offering management for high-level upgrades. Know when to stop upgrading (diminishing returns past certain level). Use appropriate skill during process. Add attributes to target items
- **Notes**: v2 has a full upgrade implementation. item_grade(item) determines which scroll is needed. Upgrade success is probabilistic — may fail and the item could lose a level (or be protected by grace/blessing).
- **Upgrade failure**: Item is destroyed on failure. This is the primary risk/reward constraint.
- **MVP stop condition**: Stop upgrading an item once grade 1 scrolls are required (level threshold varies by item type — reference previous implementations for grade determination logic).
- **End-state**: Use offerings to boost success odds once *scroll1 is needed. Certainly use offerings for *scroll2 attempts. Attributes are out of MVP scope (require targeted gear goals). See gear-progression.md for full gear improvement strategy.

## Item Compound Workflow

- **What**: Combine 3 identical items into one higher-level item: retrieve 3 items + scroll, travel to NPC, execute compound
- **MVP**: Similar to upgrade but requires 3 copies of the same item at the same level. Retrieve from bank, buy compound scroll (cscroll), travel to NPC, call `compound(slot1, slot2, slot3, scroll_slot)`. Wait for cooldown.
- **End-state**: Compound planning — identify which items have 3+ copies in bank, prioritize by value gain. Decide whether to compound or sell individually. Use appropriate skill during process. Add attributes to target items
- **Notes**: v2 has compound implementation. Compound scrolls are different from upgrade scrolls (cscroll vs uscroll). Same stop condition and failure behavior as upgrade — item destroyed on failure, stop at grade 1 scroll requirement. See gear-progression.md.

## Scroll Acquisition

- **What**: Determine which scroll grade is needed and purchase it
- **MVP**: Use `item_grade(item)` to determine scroll grade (0, 1, or 2). Buy the matching uscroll or cscroll type from NPC.
- **End-state**: Stock up on common scroll grades ahead of time. Track scroll usage rate.
- **Notes**: Part of upgrade/compound workflow. The scroll grade must match or exceed the item's grade.

## Upgrade Cooldown Handling

- **What**: Wait for upgrade/compound operation to complete before continuing
- **MVP**: After calling upgrade()/compound(), check `character.q.upgrade.ms` for cooldown remaining. Wait that duration before evaluating result.
- **End-state**: Same — this is a game constraint.
- **Notes**: v2 uses the cooldown value to schedule the next action.

## Merchant Stand Operation

- **What**: Open/close merchant stand for player-to-player trading
- **MVP**: Open stand when stationary at trade-friendly location (town, near other merchants). Close stand before moving. List items at configured prices.
- **End-state**: Dynamic pricing — adjust prices based on market activity, item rarity, demand. Rotate trade inventory to show different items.
- **Notes**: v2 opens/closes stand contextually. Merchant stand is visible to other players and enables passive trading.
- **Pricing strategy**:
  - No live market data available from game (only general estimated price). Discord economy exists but is beyond MVP.
  - Merchant only gains XP from buying/selling with other player characters (not own characters). Minor XP from having stand open for long durations.
  - Stand open shows 16 trade slots to other players; closed shows only first 4.
  - Stand significantly limits movement speed — movement system must close stand before any movement, reopen when movement completes.
  - **MVP default trade offers**: Buy *pot0/1 and *scroll0 at 1.1x base price. Sell *pot0/1 and *scroll0 at 0.9x base price. This is an intentionally lossy strategy to foster player interaction and gain merchant XP.
  - **Purchase caps**: scrolls ≤200 of any type, potions ≤1000 of any type. Sales can exceed caps using overages (e.g., 205 scrolls = 5 safe to sell at loss) and gold exceeding baseline target.
  - **Idle position**: Near Ponty at ~(0,0) on mainland for visibility and possible Ponty interactions (may count for XP).
- **End-state**: Wandering merchant (scout maps, increase trade exposure). Log observed trade offers for later fulfillment from bank. Dynamic pricing beyond fixed multiplier.

## Player Trade Evaluation

- **What**: Assess nearby player trade listings, buy underpriced items, sell overpriced items
- **MVP**: Scan `ctx.world.charactersOfferingTrade` for nearby characters with trade offerings. Check their trade slots for items below market value (using item_value() as baseline). Buy opportunities that exceed value threshold. Sell own items that others are requesting at good prices.
- **End-state**: Sophisticated trade AI — track item price history, identify arbitrage opportunities, maintain buy/sell walls for high-volume items. Reputation tracking for frequent trade partners.
- **Notes**: v2 evaluates trades using value-based thresholds (buy if price < 2x NPC value, sell if price > 0.5x NPC value). This is conservative but safe.
- **Trade mechanics**:
  - Trades are async. Characters list items for sale (moved to trade slot, no longer in inventory). Other characters purchase at listed price.
  - Characters can also list buy requests (item + price + quantity). Other characters sell to them at that price.
  - Both sell and buy listings support quantity (e.g., sell 10 scrolls at price X). Buyers/sellers can transact any quantity between 1 and remaining listed quantity.
  - MVP: merchant attempts to fulfill any trade offered by own characters without price evaluation (supports trade-slot resupply approach — see resupply workflow).

## Item Transfer Between Characters

- **What**: Send items and gold to other characters via `send_item(name, slot, quantity)` and `send_gold(name, amount)`
- **MVP**: Part of resupply workflow. Merchant sends potions to hunters at field locations. Hunters send junk loot back to merchant. Requires characters to be on the same map and nearby.
- **End-state**: Batch transfer optimization — send all needed items in one exchange. Track delivery history for verification.
- **Notes**: v2 uses send_item() and send_gold() in sendJunkToPlayer(). These require proximity (same map, close range).
- **Constraints**: Players must be nearby (slightly closer than visible range) for transfers. Only limit is inventory capacity (42 items per character).

## Field Resupply Workflow

- **What**: Complete merchant supply run: withdraw gold -> buy potions -> travel to hunters -> deliver supplies -> collect junk -> return to bank -> deposit
- **MVP**: Multi-step objective workflow:
  1. Detect low supplies (hunter status shows low potions)
  2. Travel to bank, withdraw gold
  3. Travel to potion vendor, buy potions
  4. Travel to hunter party location (from status snapshots)
  5. Trade potions to hunters, collect junk items
  6. Travel to bank, deposit junk and excess gold
  7. Return to idle, evaluate next task
- **End-state**: Optimized routing — combine bank/vendor/delivery into shortest path. Predictive resupply — don't wait until hunters are out, resupply based on burn rate. Emergency resupply triggered by critical potion alert.
- **Notes**: 
  - v2 has a full restock state implementation. This is one of the most complex implemented workflows, though gear progression is the most complex overall.
  - Hunter location detected from status snapshots in localStorage (map, x, y). Hunters have a defined location they should be at (farm zone). If not there, they should be transitioning. Merchant can verify via CM ping for current status. If hunter not transitioning, merchant sends CM to reset/override state to intended destination.
  - **Trade-slot resupply complement**: Hunters maintain trade slots listing items they need (willing to purchase at 1g/item). Merchant fulfills own characters' trade requests when nearby without price evaluation. This handles potion restocking passively when merchant is in proximity. Loot offloading still requires bank trips (bank single-occupancy constraint may require multiple trips).
  - Merchant should also resupply on a fixed interval (~5-30 minutes) regardless of explicit requests, to stay ahead of supply depletion.

## Restock Detection

- **What**: Monitor hunter inventory levels to trigger resupply
- **MVP**: Read hunter status snapshots from localStorage. Hunters should include a variable for if they need a resupply (either low potion stock or inventory over 50% capacity). If any hunter needs resupply gather supplies and then perform restock loop until all inventories have been collected/emptied of junk
- **End-state**: Predictive restock — estimate potion burn rate from combat metrics, schedule resupply before running out. Factor in travel time to calculate optimal trigger point.
- **Notes**: Current party status snapshots include HP/MP but NOT inventory/potion counts — this needs to be added to status publishing.
- **MVP thresholds**: Resupply triggered when potions < 50% target levels OR inventory > 50% full. Starting potion targets: 100 *pot0, 20 *pot1 per hunter. Will evolve with party affluence.
- **Polling frequency**: Every ~5-30 minutes via localStorage is sufficient. Not time-critical — resupply is preemptive.

## Hunt Target Management

- **What**: Merchant selects and publishes farm target for the hunter party
- **MVP**: Merchant reads a configured default farm target and writes it to localStorage key `al_bot:config:farmTarget`. Hunters read this via config.reload(). Simple — merchant is the authority for what to farm.
- **End-state**: Merchant evaluates party capability, available monsters, and progression goals to dynamically select optimal farm target. Publishes changes via CM for immediate hunter response. Rotation between targets for variety and efficiency.
- **Notes**: v2 sets hunt target from G.maps data (hardcoded to specific monster index). Current config system reads farmTarget from localStorage. The mechanism exists — it just needs the merchant to be the writer.

## Equipment Improvement Planning

- **What**: Evaluate which items to upgrade/compound for party gear progression
- **MVP**: Scan bank catalog for items with upgrade/compound potential. Prioritize by: items that would be direct upgrades for party members, items with low upgrade cost (low grade scrolls), items with 3+ copies (compound candidates). Execute improvements in priority order.
- **End-state**: Full gear progression planning — track each party member's equipment, identify weakest slots, target specific upgrades. Expected value calculation for each potential improvement (success rate vs cost vs stat gain). Long-term goals (target specific item levels for each slot).
- **Notes**: hyper-fixate has can_improve() and equipment catalog. This requires knowing what each party member has equipped (from status snapshots) and what's available in the bank.
- **Notes (additional)**: Gear progression is the most complex game element. This section covers the merchant execution side — see gear-progression.md for the full strategy including comparison, acquisition, and goal planning. MVP: untargeted improvement of what's available. Attributes are out of MVP scope.
