# Merchant and Progression Requirements

## Inventory and Equipment

### R21 — Inventory and Equipment Awareness

- **Description**: The bot must maintain awareness of inventory contents, banked items, equipped gear, and available space across active characters.
- **Why**: Merchant support and progression decisions depend on accurate, current stock visibility.
- **Baseline**: Refresh and normalize item data for active characters and bank interactions. Track what is carried, stored, and equipped.
- **Priority**: `must`

### R22 — Equipment Upgrade Identification

- **Description**: The bot must identify equipment upgrades and replacements using a repeatable evaluation approach.
- **Why**: Gear progression is the primary reason for a merchant-supported party. Ad hoc gear decisions waste resources. Gear progression weighs more heavily on character strength than level progression.
- **Baseline**: Compare candidate items against currently equipped items using documented scoring or rules. Flag upgrades. MVP comparison: same item name + higher level = upgrade. Ring slots (ring1, ring2) and earring slots (earring1, earring2) require multi-slot comparison logic. End-state: weighted stat comparison by character class.
- **Priority**: `must`

## Supply Workflows

### R23 — Hunter Supply Monitoring

- **Description**: The bot must detect when hunters need potions, have excess junk, or have pending gear deliveries.
- **Why**: The merchant's value comes from keeping combat characters productive and unburdened.
- **Baseline**: Monitor hunter supply state through shared status. Detect low potion stock, inventory overflow, and pending transfers.
- **Priority**: `must`

### R24 — Field Resupply

- **Description**: The merchant must be able to gather stock, travel to the hunting party, deliver supplies, and collect loot — without requiring hunters to return to town.
- **Why**: Recalling every hunter to town for resupply is inefficient and interrupts farming.
- **Baseline**: Complete field resupply workflow: stock up, travel to party, transfer items, collect junk/overflow, return.
- **Priority**: `must`

### R25 — Wishlist/Request Coordination

- **Description**: Hunters should be able to publish desired consumables or item requests that the merchant can fulfill.
- **Why**: Decouples merchant decision-making from hunter needs. The merchant doesn't need to guess what hunters want.
- **Baseline**: MVP is a simple boolean resupply-needed flag published in status snapshot (potions < 50% target levels OR inventory > 50% full). Complements trade-slot resupply approach (R55). End-state adds structured wishlists with potion counts by tier and desired gear items.
- **Priority**: `should`

## Item Improvement

### R26 — Upgrade and Compound Workflows

- **Description**: The bot must support upgrade and compound workflows — selecting target items, acquiring materials, traveling to NPCs, and executing improvements.
- **Why**: Adventure Land's progression systems explicitly include both upgrade and compound paths. Ignoring them caps gear progression.
- **Baseline**: End-to-end workflow for upgrading and compounding items, including material acquisition and NPC interaction. MVP stop condition: stop upgrading/compounding once grade 1 scrolls are required (level threshold varies by item type — reference previous implementations for grade determination). Failure destroys the item — accepted risk at grade 0 scroll levels. Attributes are a post-MVP extension (require targeted gear goals).
- **Priority**: `must`

### R27 — Expected Value Improvement Planning

- **Description**: The bot should apply configurable rules for whether an item is worth upgrading, considering success rates, material costs, and tier value.
- **Why**: Gold and materials are limited. Game data includes success rates and tier information. Blind upgrading wastes resources.
- **Baseline**: This requirement targets end-state, not MVP. MVP performs untargeted improvement of available items using grade 0 scrolls only. Expected value calculation with offerings begins when `*scroll1` is required. Configurable rules that evaluate expected value before committing to an upgrade or compound attempt at higher grades.
- **Priority**: `should`

## Economy

### R28 — Player Trade Interaction

- **Description**: The bot should detect nearby trade offers and evaluate them against configured rules.
- **Why**: Prior implementations treated merchant-driven economy as a useful progression path.
- **Baseline**: Detect player trade offers, evaluate against configurable policies, accept or reject.
- **Priority**: `should`

### R29 — Standard Offers and Opportunistic Purchases

- **Description**: The merchant should maintain configurable standing offers for common consumables and make opportunistic purchases.
- **Why**: Commodity trading generates merchant experience (merchant only levels through player character interactions). Intentionally lossy trade strategy fosters interaction and drives XP accumulation.
- **Baseline**: MVP default offers: buy `*pot0/1` and `*scroll0` at 1.1x base price, sell at 0.9x base price. Purchase caps: scrolls ≤200, potions ≤1000 of any type. Sales permitted using overages above caps and gold exceeding baseline target (R54). Merchant should attempt to fulfill any trade offered by own characters without price evaluation.
- **Priority**: `should`

## Objective Selection

### R30 — Party-Capability-Aware Targeting

- **Description**: The bot must choose farm targets that match the current party's strength and composition.
- **Why**: The bot needs to avoid both trivially easy targets (inefficient) and impossible targets (deadly).
- **Baseline**: Evaluate party capability against monster characteristics to select practical farming targets.
- **Priority**: `must`

### R31 — Objective Type Distinction

- **Description**: The bot should distinguish between gold, XP, material, and progression objectives.
- **Why**: Different objectives lead to different target and behavior choices. Without explicit framing, the bot makes chaotic decisions.
- **Baseline**: Support distinct objective modes (gold farming, XP farming, material farming, progression) that influence target selection.
- **Priority**: `should`

### R32 — Token/Recipe/Special-Item Progression

- **Description**: The bot should account for progression paths that involve token collection, recipe crafting, or special item exchanges.
- **Why**: Game reference data shows progression is broader than raw drop farming. Tokens, recipes, and exchanges are real systems.
- **Baseline**: Allow target selection to be justified by token/recipe/exchange goals, not only direct drops.
- **Priority**: `later`

## Merchant Stand and Economy

### R52 — Merchant Stand Management

- **Description**: The merchant must manage stand lifecycle — close before all movement, reopen when movement completes.
- **Why**: Open stand significantly limits movement speed. Stand state affects trade visibility (16 slots when open vs 4 when closed) and provides minor merchant XP while open. Incorrect stand management breaks movement or wastes trading opportunity.
- **Baseline**: Close stand before any movement (including short repositioning during NPC workflows). Reopen at destination. Idle position near Ponty at ~(0,0) on mainland for visibility and possible Ponty interactions.
- **Priority**: `must`

### R53 — NPC Selling

- **Description**: The merchant must sell classified items to NPCs for gold.
- **Why**: NPC selling is the primary gold conversion pathway for collected loot. Ponty is the only NPC that buys items. Distinct from player trade interaction (R28) and field resupply (R24).
- **Baseline**: Classify items for sale during inventory cataloging (R21). Travel to Ponty. Sell each for-sale item via `sell(slot, quantity)`.
- **Priority**: `must`

### R54 — Gold Management Strategy

- **Description**: The merchant must maintain a gold baseline target and allocate hunting profit according to a defined strategy.
- **Why**: Without a gold strategy, the merchant cannot distinguish between operating capital, improvement budget, and savings. Uncontrolled spending wastes resources; uncontrolled saving stalls progression.
- **Baseline**: Baseline target stored in localStorage. Initialized to current total gold (bank + on merchant) if not set. Grows by ~10% of gold retrieved from hunters after each resupply. Ramps toward 112,500,000 gold (most expensive bank slot upgrade). Profit allocation: potion restock → merchant XP (lossy trades) → baseline growth. Lossy trade practices (R29) only with gold exceeding baseline target.
- **Priority**: `must`

## Supply Workflows (continued)

### R55 — Trade-Slot Resupply

- **Description**: Hunters must maintain trade slots listing needed items, which the merchant fulfills when nearby.
- **Why**: Passive resupply mechanism that complements field resupply (R24). Reduces explicit supply-run frequency by handling restocking opportunistically during proximity.
- **Baseline**: Hunters list needed items in trade slots at 1g/item. Merchant fulfills own characters' trade requests when nearby without price evaluation. Loot offloading still requires bank trips (bank single-occupancy constraint per R58).
- **Priority**: `must`

### R56 — Hunter Gear Delivery

- **Description**: The merchant must deliver improved gear to hunters and collect old gear during resupply.
- **Why**: Gear progression requires getting improved items from merchant inventory/bank to the hunters who need them. Without delivery, improvement results sit unused in the bank.
- **Baseline**: Merchant stores item catalogue in localStorage. Hunters assess catalogue and request items that are upgrades (same item name + higher level per R22). Merchant gathers requested items and delivers during resupply. Hunter equips new gear, offloads old gear. First requester gets item if multiple request same item. Ring/earring multi-slot handling required.
- **Priority**: `must`

## Item Improvement (continued)

### R57 — Gear Goal Planning

- **Description**: The bot should determine next-step gear progression targets for party members.
- **Why**: Without gear goals, improvement is untargeted — the merchant improves whatever is available. Goals enable directed farming, acquisition, and improvement decisions.
- **Baseline**: Two candidate approaches: hardcoded pathway (manual set progression with level thresholds per set) as baseline, automated evaluation (assess party equipment, identify weakest slots, estimate acquisition cost) as evolution. Not needed for MVP — untargeted improvement provides value, and the end-state approach is undecided.
- **Priority**: `later`

## Banking

### R58 — Bank Operations

- **Description**: The merchant must support bank deposit, store, and retrieve operations as foundational workflows.
- **Why**: Banking is implicit in field resupply (R24) but is foundational for multiple merchant workflows (resupply, improvement, cataloging, gold management). Game constraint: only 1 of a player's characters can be in the bank at any given time.
- **Baseline**: Travel to bank NPC. Deposit gold via `bank_deposit()`. Store items via `bank_store()`. Retrieve specific items via `bank_retrieve(pack, slot)`. MVP uses `bank_store()` auto-placement. Respect single-character bank occupancy constraint.
- **Priority**: `must`
