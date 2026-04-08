# Phase 4: Merchant Support

Implement the merchant system. The merchant gathers junk, restocks potions, and supports the hunting party. MVB is complete.

## Scope

### Merchant System
- Inventory monitoring: track hunter supply needs via localStorage/CM
- Restock workflow: purchase potions, gather needed supplies
- Field delivery: travel to hunting party, deliver supplies, collect junk/overflow
- Return to town for banking, selling, and restocking
- Bank interactions: deposit valuable items, withdraw needed materials

### Merchant Movement
- Town navigation: travel between bank, potion vendor, and other NPCs
- Field travel: navigate to hunter party location
- Return travel: back to town after delivery

### Merchant Objective Integration
- Merchant acts as coordinator: reads party status, initiates supply runs
- Merchant-specific state catalog: idle in town, restocking, traveling to party, delivering, returning
- Dynamic hunter loading decisions deferred to post-MVB (merchant currently supports fixed roster)

## Prerequisites

- Phase 3 complete (party hunting together)
- Contracts authored: `contracts/merchant.md`

## Acceptance Criteria

1. Merchant detects when hunters need potions (low stock via shared status)
2. Merchant purchases potions and supplies in town
3. Merchant travels to hunting party location
4. Merchant delivers supplies and collects junk/overflow from hunters
5. Merchant returns to town and deposits/sells collected items
6. Merchant resumes idle monitoring after completing a supply run
7. Supply cycle repeats without manual intervention
8. Full system (3 hunters + 1 merchant) operates unattended for extended periods

## Requirements Addressed

R21 (inventory awareness), R22 (equipment identification), R23 (hunter supply monitoring), R24 (field resupply), R26 (upgrade/compound workflows — basic support), R33 (map points of interest), R34 (NPC navigation)

## MVB Complete

With Phase 4, all MVB criteria are met:
- 1 merchant + 3 hunters loaded and operating
- Combat bots synchronized to move and hunt together
- Combat bots taskable to hunt target packs (via localStorage)
- Merchant gathers junk/overflow and restocks potions
