# Merchant and Progression Requirements

## Inventory, banking, and equipment management

### R21

- Description: The system must maintain awareness of inventory, banked items, equipped gear, and available empty space.
- Why it matters: Merchant support and progression decisions depend on accurate stock visibility.
- Minimum baseline behavior: Refresh and normalize item data for active characters and bank interactions.
- Priority: `must`

### R22

- Description: The system must identify equipment upgrades or replacements in a repeatable way.
- Why it matters: Gear progression is one of the main reasons to use a merchant-supported party.
- Minimum baseline behavior: Compare candidate items against equipped items using a documented scoring or rule approach.
- Priority: `must`

## Merchant supply workflows

### R23

- Description: The merchant must monitor hunter supply needs and junk collection needs.
- Why it matters: Merchant value comes from keeping combat characters productive.
- Minimum baseline behavior: Detect low potion stock, excess junk, and pending gear deliveries using shared status.
- Priority: `must`

### R24

- Description: The merchant must be able to resupply party members in the field.
- Why it matters: Returning every hunter to town is inefficient.
- Minimum baseline behavior: Gather stock, travel to party, transfer requested items, and collect return loot.
- Priority: `must`

### R25

- Description: The system should support wishlist or request-based supply coordination.
- Why it matters: Prior art showed this is a clean way to decouple merchant decisions from hunter needs.
- Minimum baseline behavior: Hunters publish desired consumables and item requests in a defined schema.
- Priority: `should`

## Item improvement

### R26

- Description: The merchant must support upgrade and compound workflows for selected items.
- Why it matters: The game’s progression systems explicitly include both.
- Minimum baseline behavior: Select target items, acquire needed scrolls/materials, move to the correct NPC, and execute the improvement action.
- Priority: `must`

### R27

- Description: Improvement planning must consider expected value rather than blindly upgrading everything.
- Why it matters: Gold and materials are limited; the game data includes success rates and item tiers.
- Minimum baseline behavior: Apply configurable rules for when an item is worth upgrading or compounding.
- Priority: `should`

## Economy and trading

### R28

- Description: The merchant should support player trade interaction for buying and selling.
- Why it matters: Prior art consistently treated merchant economy as a useful progression path.
- Minimum baseline behavior: Detect nearby trade offers and evaluate them against simple rules.
- Priority: `should`

### R29

- Description: The merchant should support maintaining standard consumable offers and opportunistic purchases.
- Why it matters: Commodity trade can fund progression and merchant XP.
- Minimum baseline behavior: Maintain a configurable policy for potion/scroll/basic-item trading.
- Priority: `later`

## Progression-oriented objective selection

### R30

- Description: The system must select hunting or farming targets that match current party capability.
- Why it matters: A progression bot needs to avoid both trivial inefficiency and suicidal target choices.
- Minimum baseline behavior: Use party strength and monster characteristics to choose practical objective targets.
- Priority: `must`

### R31

- Description: The system should distinguish between gold, XP, material, and progression-driven objectives.
- Why it matters: A fresh bot needs explicit objective framing to avoid chaotic behavior.
- Minimum baseline behavior: Support objective modes or weighted target selection.
- Priority: `should`

### R32

- Description: The system should account for token, recipe, and special-item progression paths where relevant.
- Why it matters: The reference data shows progression is broader than raw drop farming.
- Minimum baseline behavior: Allow certain target selections to be justified by crafts, exchanges, or token rewards.
- Priority: `later`
