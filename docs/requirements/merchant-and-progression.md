# Merchant and Progression Requirements

## Inventory and Equipment

### R21 — Inventory and Equipment Awareness

- **Description**: The bot must maintain awareness of inventory contents, banked items, equipped gear, and available space across active characters.
- **Why**: Merchant support and progression decisions depend on accurate, current stock visibility.
- **Baseline**: Refresh and normalize item data for active characters and bank interactions. Track what is carried, stored, and equipped.
- **Priority**: `must`

### R22 — Equipment Upgrade Identification

- **Description**: The bot must identify equipment upgrades and replacements using a repeatable evaluation approach.
- **Why**: Gear progression is the primary reason for a merchant-supported party. Ad hoc gear decisions waste resources.
- **Baseline**: Compare candidate items against currently equipped items using documented scoring or rules. Flag upgrades.
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
- **Baseline**: A defined schema for hunters to publish supply requests. Merchant reads and acts on them.
- **Priority**: `should`

## Item Improvement

### R26 — Upgrade and Compound Workflows

- **Description**: The bot must support upgrade and compound workflows — selecting target items, acquiring materials, traveling to NPCs, and executing improvements.
- **Why**: Adventure Land's progression systems explicitly include both upgrade and compound paths. Ignoring them caps gear progression.
- **Baseline**: End-to-end workflow for upgrading and compounding items, including material acquisition and NPC interaction.
- **Priority**: `must`

### R27 — Expected Value Improvement Planning

- **Description**: The bot should apply configurable rules for whether an item is worth upgrading, considering success rates, material costs, and tier value.
- **Why**: Gold and materials are limited. Game data includes success rates and tier information. Blind upgrading wastes resources.
- **Baseline**: Configurable rules that evaluate expected value before committing to an upgrade or compound attempt.
- **Priority**: `should`

## Economy

### R28 — Player Trade Interaction

- **Description**: The bot should detect nearby trade offers and evaluate them against configured rules.
- **Why**: Prior implementations treated merchant-driven economy as a useful progression path.
- **Baseline**: Detect player trade offers, evaluate against configurable policies, accept or reject.
- **Priority**: `should`

### R29 — Standard Offers and Opportunistic Purchases

- **Description**: The merchant should maintain configurable standing offers for common consumables and make opportunistic purchases.
- **Why**: Commodity trading can fund progression and generate merchant experience.
- **Baseline**: Configurable buy/sell policies for common items. Opportunistic purchase evaluation.
- **Priority**: `later`

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
