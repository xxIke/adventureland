# Intent: Gear Progression

Covers the full gear improvement lifecycle: equipment improvement (upgrade/compound), equipment acquisition, gear comparison, gear goals, and hunter gear management. Gear progression is the core pillar of the game that all other mechanics feed into — better gear enables hunting for/acquiring better gear.

---

## Equipment Improvement (Upgrade)

- **What**: Use scrolls to upgrade individual items to higher levels via upgrade NPC
- **MVP**: Merchant evaluates bank catalogue for upgradeable items. Retrieves item + scroll, travels to Cue (-207, -200, mainland), executes upgrade(). Stop condition: stop once grade 1 scrolls (*scroll1) are required. Failure destroys the item — accepted risk at grade 0 scroll levels.
- **End-state**: Expected value calculation before upgrading. Use offerings to boost success odds once *scroll1 is needed, certainly for *scroll2. Track success/failure rates. Use appropriate merchant skill during process.
- **Notes**: See merchant.md for execution workflow details. item_grade(item) determines scroll grade needed. Level threshold for grade change varies by item type — reference previous implementations.

## Equipment Improvement (Compound)

- **What**: Combine 3 identical items at same level into one higher-level item via compound NPC
- **MVP**: Merchant identifies items with 3+ copies at same level in bank. Retrieves 3 items + cscroll, travels to Cue, executes compound(). Same stop condition as upgrade (stop at grade 1 scroll requirement). Failure destroys items.
- **End-state**: Compound planning — prioritize by value gain. Decide whether to compound or sell individually. Use appropriate merchant skill during process.
- **Notes**: Compound scrolls (cscroll) are distinct from upgrade scrolls (uscroll). Same stop condition and risk profile as upgrade.

## Equipment Improvement (Attributes)

- **What**: Add attribute augmentations to equipment
- **MVP**: Out of scope. Requires targeted gear goals to know what attributes to add to what gear.
- **End-state**: Merchant adds targeted attributes to specific equipment pieces based on gear goals and character class needs. Highly similar to upgrade/compound logic but needs goal-driven decision-making.
- **Notes**: Attribute augmentation is the final stage of item improvement. Mechanics similar to upgrade/compound but with attribute selection complexity.

## Equipment Acquisition — Gold Exchange

- **What**: Use gold to buy standard equipment from NPC vendors for improvement base material
- **MVP**: Implementation complexity is in-scope (mirrors potion/scroll acquisition from NPC vendors). However, execution/strategy should likely be deferred beyond MVP to avoid wasting resources without targeted gear goals.
- **End-state**: Merchant identifies standard equipment worth purchasing as upgrade/compound base material. Buys from appropriate NPC vendor.
- **Notes**: This provides base items for the improvement pipeline. Without gear goals, gold spent on random equipment is wasteful.

## Equipment Acquisition — Item Exchange

- **What**: Exchange items (e.g., monster tokens) for targeted gear at exchange NPCs
- **MVP**: Execution deferred beyond MVP to avoid resource waste. Complexity is a small increase from gold acquisition.
- **End-state**: Merchant tracks exchangeable token/item balances, identifies valuable exchange targets, travels to exchange NPC, executes exchange(). Exchange is async (3-6 seconds).
- **Notes**: Monster tokens earned from hunt quests (1 normal, 100 hardcore). Tokens are spent at exchange NPCs for gear. See objective.md monster hunt quest for token earning.

## Equipment Acquisition — Crafting

- **What**: Use craft() to combine items per recipes at craftsman NPC
- **MVP**: Execution deferred beyond MVP. Complexity is a small increase from item exchange.
- **End-state**: Merchant checks craft recipes (G.craft/D.craftmap) against available materials. Executes at craftsman NPC. Requires recipe knowledge and material dependency tracking.
- **Notes**: Crafting is a stage of gear progression beyond simple purchasing. See world.md for crafting mechanics.

## Equipment Acquisition — Drop Farming

- **What**: Direct hunters to farm specific monsters for target item drops
- **MVP**: Difficult to fold into MVP scope — requires targeted gear goals to drive farming decisions. Items have drop rates from both monsters and maps.
- **End-state**: Merchant identifies needed items, determines which monsters/maps drop them (from G data/drop tables), directs hunters to farm those targets. Integrates with objective type distinction (material farming mode).
- **Notes**: This creates a feedback loop with the objective system — gear goals drive farm target selection.

## Gear Comparison

- **What**: Compare two pieces of equipment to determine which is better for a character
- **MVP**: Simple comparison: is the candidate the same item name as currently equipped? Is it a higher level? If yes to both, it's an upgrade. Otherwise ignore. This is a placeholder for more sophisticated comparison.
- **End-state**: Weighted stat comparison by character class (warrior values armor, mage values int). Factor in set bonuses, special effects, attribute augmentations. Compare across equipment slots to identify weakest slot for targeted improvement.
- **Notes**: Ring slots (ring1, ring2) and earring slots (earring1, earring2) have multiple slots each — comparison logic must handle multi-slot equipment types. Mainhand and offhand slots exist with dual-wield possibilities (not yet explored for strategy).

## Gear Goals

- **What**: Determine the next step in gear progression for each party member
- **MVP**: No automated gear goals. Untargeted improvement of whatever is available (upgrade/compound items in bank using grade 0 scrolls). Manual gear management supplements this — user can equip intended items which drives passive progression through the improvement system.
- **End-state**: Two possible approaches (not yet decided):
  1. **Automated**: Bot evaluates party equipment, identifies weakest slots, estimates acquisition difficulty/cost, determines optimal next improvement step
  2. **Hardcoded pathway**: Manual analysis defines set progression with level thresholds per set (e.g., "don't attempt this set beyond level N, move to next set"). Bot executes against the defined plan.
  - The hardcoded approach is likely the baseline, with automated assessment as a more advanced evolution.
- **Notes**: This is the most complex game element to solve. Gear goals drive all acquisition and improvement decisions. Without goals, improvement is untargeted but still provides value (anything improved is better than unimproved).

## Hunter Gear Management

- **What**: Get improved gear from merchant to hunters during resupply
- **MVP**: Merchant stores item catalogue in localStorage. Hunters assess catalogue and request items that are improvements to current gear (same item name + higher level = upgrade). Merchant gathers requested items and delivers during resupply workflow. Hunter equips new gear and offloads old gear.
- **End-state**: Structured gear wishlists from hunters. Merchant prioritizes deliveries by impact. Smart multi-slot handling for rings/earrings.
- **Notes**:
  - If multiple hunters request the same item (and only 1 exists), deliver to first requester. No fulfillment prioritization needed for MVP.
  - Ring slots (ring1, ring2) and earring slots (earring1, earring2) require more complex comparison logic for multi-slot types.
  - This enables basic passive gear progression: user manually equips target items on hunters, improvement system upgrades what's equipped, resupply delivers improvements back.
