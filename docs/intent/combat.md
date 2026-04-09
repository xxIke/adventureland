# Intent: Combat

Covers attack execution, healing, class skills, conditions/debuffs, aggro management, and PvP response.

---

## Basic Attack

- **What**: Select target, call `attack()`, respect attack/heal shared cooldown
- **MVP**: Character attacks the targeting system's current target at cooldown-gated frequency. Fire-and-forget with error logging.
- **End-state**: Same — this is a thin executor and unlikely to grow in complexity.
- **Notes**: Currently implemented in attack.js. No changes expected.

## Heal Ally

- **What**: Call `heal()` on party member missing significant HP, sharing cooldown with attack
- **MVP**: Heal strategy evaluates party members, selects highest deficit that meets threshold (80% of heal power or >25% max HP missing). Heal takes priority over attack when both strategies are present.
- **End-state**: Smarter heal priority — consider incoming damage rate, member role (heal tank first?), and preemptive healing when damage is predictable.
- **Notes**: Currently implemented via heal targeting strategy + attack.js executor. Economy check thresholds may need tuning in practice.

## Target Priority

- **What**: Tiered target selection: hostiles > farm targets > specials > easy kills
- **MVP**: Five tiers with nearest-in-tier selection, stickiness to avoid flapping, party dedup for lower tiers.
- **End-state**: Add threat scoring within tiers (not just nearest — factor in remaining HP, damage output, whether target is fleeing). Consider target switching cost (partially-damaged targets are more valuable than fresh ones).
- **Notes**: Currently implemented in targeting.js. Tier ordering is correct but intra-tier selection is purely distance-based.

## Target Stickiness

- **What**: Keep current target if still valid rather than constantly re-evaluating
- **MVP**: Current target retained if still alive and in same or higher tier.
- **End-state**: Same principle, possibly with a "frustration timer" — if stuck on a target too long (evading, out of range), switch.
- **Notes**: Currently implemented. No immediate gaps.

## Party Target Dedup

- **What**: Spread targets across party members so multiple characters don't pile on same mob
- **MVP**: For target/easy tiers, prefer entities with `entity.targets === 0`. Fall back to nearest if all claimed.
- **End-state**: Cross-character target coordination via localStorage or CM — not just local entity.targets check but active "I'm attacking X" publishing.
- **Notes**: Currently checks entity.targets which reflects game-server-side targeting. May not account for party members on different maps or delayed updates.

## Looting Chests

- **What**: Pick up dropped loot after kills via `loot()`
- **MVP**: Attack system opportunistically loots each tick before attacking.
- **End-state**: Same — loot is simple and doesn't need sophistication.
- **Notes**: Currently implemented in attack.js.

## Class Skills — Ranger

- **What**: Use ranger-specific combat skills (huntersmark, poisonarrow, supershot) on independent cooldowns
- **MVP**: Not implemented. Ships with no-op skill strategy.
- **End-state**: Ranger skill strategy that prioritizes huntersmark on high-HP targets, uses poisonarrow for sustained damage, supershot for burst. Checks `is_on_cooldown()` per skill. Respects MP cost.
- **Notes**: hyper-fixate has working ranger skills. Need to verify skill names and cooldowns from G.skills. Default party is paladin, ranger, priest — ranger skills are high priority for post-MVP.

## Class Skills — Priest

- **What**: Use priest combat skills (curse, partyheal, absorb, revive, darkblessing, phaseout)
- **MVP**: Able to use party heal to offset healing output as needed (burst/surge healing).
- **End-state**: Priest skill strategy — curse high-HP enemies, partyheal for AoE healing, revive dead party members (if in range), absorb to transfer debuffs. Priority: revive > partyheal (if multiple injured) > curse > normal heal/attack cycle.
- **Notes**: hyper-fixate has partial priest skills. partyheal and revive are high-impact for party survivability. Revive is unique — no other class can bring back dead members without respawn.
- **Notes (additional)**: Default party is paladin, ranger, priest. Priest partyheal and revive are high-impact. Revive may mitigate/prevent death penalty — desired end-state is to be revived if plausible before auto-respawn.

## Class Skills — Paladin

- **What**: Use paladin skills (mshield, selfheal, purify, smash)
- **MVP**: Able to use selfheal to burst heal self as needed.
- **End-state**: Paladin skill strategy — mshield as sustained defense toggle, selfheal for HP recovery, purify to cleanse debuffs, smash for damage. mshield management is key (drains MP, strong mitigation).
- **Notes**: hyper-fixate has working paladin skills. mshield is a toggle — needs on/off management based on incoming damage vs MP pool.

## Class Skills — Warrior

- **What**: Use warrior skills (charge, cleave, stomp, taunt)
- **MVP**: Not implemented. Ships with no-op.
- **End-state**: Warrior skill strategy — taunt to pull aggro (tank role), stomp for AoE stun, charge for gap closing, cleave for multi-target damage.
- **Notes**: Warrior is likely the tank class. Taunt usage should coordinate with aggro system.
- **Notes (additional)**: Warrior is not in default party (paladin, ranger, priest) so warrior skills are lower priority. Verify available skills from G.skills or server reference.

## Class Skills — Mage

- **What**: Use mage skills (burst, fireball, cburst, energize, magiport)
- **MVP**: Not implemented. Ships with no-op.
- **End-state**: Mage skill strategy — cburst for AoE, energize to donate MP to allies, burst for single-target. Magiport for party teleportation (utility, not combat).
- **Notes**: Mage has energize which is a party support skill (MP donation). cburst hits multiple targets — targeting may need to account for AoE positioning.
- **Notes (additional)**: Mage is not in default party. Energize (MP donation) is a notable party support skill. Verify cburst targeting and MP cost curve from G.skills.

## Class Skills — Rogue

- **What**: Use rogue skills (backstab, invis, shadowstrike, mentalburst)
- **MVP**: Not implemented. Ships with no-op.
- **End-state**: Rogue skill strategy — invis for threat management, backstab for positional burst damage, mentalburst for MP-heavy targets.
- **Notes**: Rogue's invis could interact with kiting (drop aggro instead of kiting).
- **Notes (additional)**: Rogue is not in default party. Verify invis break conditions and backstab positioning from G.skills.

## Class Skills — Merchant

- **What**: Use merchant combat skill `scare` for crowd control
- **MVP**: Merchant has scare available for emergency self-defense. Use when targets > 0 and HP dropping.
- **End-state**: Merchant skill strategy — scare for emergency CC, mluck to buff nearby players (always-on when available), potentially buff/bless for party.
- **Notes**: Merchant is non-combat but has scare as survival tool. mluck is the primary merchant "skill" — it buffs luck for nearby characters which improves drop rates.
- **Notes (additional)**: mluck cooldown and range need verification from G.skills. Verify persistence through disconnect.

## Merchant Skills — mluck

- **What**: Merchant-specific buff skills applied to nearby characters
- **MVP**: mluck applied to nearby party members and friendly characters on cooldown. This is a significant value-add for farming efficiency.
- **End-state**: Smart mluck targeting — prioritize party members, then friendly players, skip already-buffed characters. Track buff duration to refresh before expiry.
- **Notes**: mluck increases drop rates — this is one of the merchant's key contributions to the party even while doing commerce tasks. Should run as a background loop alongside other merchant activities.

## Condition/Debuff Awareness

- **What**: Read `entity.s` (status effects) to make informed combat decisions
- **MVP**: Check `target.immune` before attacking (skip immune targets). Check basic conditions that prevent action.
- **End-state**: Full condition awareness — detect cursed targets (focus fire), stunned targets (safe to approach), poisoned allies (priest absorb), burning (don't stand in fire). Use condition info to adjust skill priority.
- **Notes**: hyper-fixate checks target.s.cursed, character.s.mshield, target.immune. The condition system is extensive (50+ conditions in G.conditions) but most are rarely relevant for automated combat.
- **Notes (additional)**: Condition awareness used for monster_hunt determination (character.s.monsterhunt state). The full condition system is extensive (50+ in G.conditions) but only a short list affects bot combat decisions — identify those specifically.

## Enemy Defense Adaptation

- **What**: Adjust targeting or skill usage based on enemy armor, resistance, evasion, reflection
- **MVP**: Not needed — farm targets are chosen by type (config), not by defense profile.
- **End-state**: When selecting between available targets in a tier, factor in defense stats. Prefer targets weak to the character's damage type. Avoid reflected-damage targets when HP is low. Skip immune targets entirely.
- **Notes**: This requires knowing each character's damage type (physical vs magical) and comparing against target.armor/target.resistance. Most farm targets are weak enough that this doesn't matter, but it becomes relevant for harder content.

## Aggro Coordination

- **What**: Tank holds aggro, non-tank characters wait for tank to establish threat before attacking high-value targets
- **MVP**: Tank identified by party system. Targeting and movement systems use tank identity (non-tanks and ranged kite when targeted, tanks hold ground). No active aggro waiting — all characters attack immediately.
- **End-state**: For high-HP targets (configurable threshold), non-tank characters delay first attack until `entity.target === tankName`. This prevents squishy characters from pulling aggro on fresh spawns.
- **Notes**: Currently tank is identified but not used for aggro gating. Phase 3+ concern per targeting contract.
- **Notes (additional)**: "High-HP" threshold is based on heuristic analysis: time to kill monster vs time for monster to kill a party member. Not a fixed number — relative to party capability.

## PvP Hostile Response

- **What**: Detect hostile player aggression, switch to defensive posture
- **MVP**: Hostile players detected by world-model and prioritized in targeting (tier 1 when pvpDefense enabled). Character will fight back or flee based on HP.
- **End-state**: Smarter PvP response — evaluate threat level (player level, gear, class), coordinate party response (focus fire or scatter), use defensive skills (invis, phaseout), flee to safe zone if outmatched.
- **Notes**: PvP is opt-in via pvpDefense config toggle. Most farming is PvE. PvP response mainly matters to avoid losing progress to griefers.

## Damage Calculation Heuristics

- **What**: Estimate party DPS, individual character DPS, monster threat level for decision-making
- **MVP**: Basic "easy monster" heuristic (hp < attack * 0.8). No formal DPS calculation.
- **End-state**: Party DPS/HPS estimation from character stats. Monster danger scoring from G.monsters stats (HP, attack, speed, range, abilities). Use these to assess whether a farm target or hunt is viable for the current party composition.
- **Notes**: hyper-fixate calculates party HPS/DPS. This feeds into objective decisions (which monster to farm) and hunt viability checks.
- **Notes (additional)**: Simple formulas are sufficient — estimates serve as "should we fight / can we win" heuristics, not precise simulations. No need for strategy comparison or detailed simulation.
