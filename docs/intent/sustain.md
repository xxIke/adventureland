# Intent: Sustain

Covers HP/MP recovery through potions and regen skills.

---

## HP Recovery
- **What**: Select hpotx/hpot1/hpot0/regen_hp based on HP deficit amount
- **MVP**: Tiered thresholds: >10000 missing = hpotx, >800 = hpot1, >400 = hpot0, default with >0 = regen_hp. Prioritized against mana recovery with mp regen having a higher priority when tied. Should be able to correctly use intended potion (arrange inventory into expected state so use_hp uses the intended potion) or use regen_hp as intended.
- **End-state**: Account for party healing assistance and better potion/regen prioritization alongside mp recovery
- **Notes**: The potion thresholds are the amount of health the potion restores, can be queried through G. Mana recovery is more critical than health recovery as mp is required even for basic attacks. System should prioritize keeping mana topped off for damage output and larger (highly effective) bursts of hp recovery

## MP Recovery

- **What**: Select mpotx/mpot1/mpot0/regen_mp based on MP deficit amount
- **MVP**: Tiered thresholds: >10000 = mpotx, >1000 = mpot1, >500 = mpot0. Prioritized against health with mp regen having a higher priority when tied. Should be able to correctly use intended potion (arrange inventory into expected state so use_mp uses the intended potion) or use regen_mp as intended.
- **End-state**: Context-aware MP management — aggressive MP recovery when using MP-heavy skills (mage burst), conservative when mostly auto-attacking. Better potion/regen prioritization alongside hp recovery
- **Notes**: Currently implemented. MP management is more critical than HP for survival. Standard regen_mp recovery will outpace mp drain from auto-attacking with basic attack

## Potion Slot Management

- **What**: Swap desired potion to last inventory position before use_skill('use_hp'/'use_mp')
- **MVP**: Finds desired tier, swaps to last potion slot position, calls use_skill.
- **End-state**: Same — this is a game API constraint that won't change.
- **Notes**: Currently implemented. Depends on swap() being synchronous (unverified but assumed).
- **Unverified**: swap() may be async — if so, must await before use_skill. Needs live testing.

## Potion Tier Fallback

- **What**: If desired potion tier unavailable, fall through to next available tier
- **MVP**: Iterates through potion list (strongest to weakest), uses first available. Final fallback to regen skill.
- **End-state**: Same cascade logic. Could add "potion critically low" alert to trigger merchant resupply.
- **Notes**: Currently implemented.

## Context-Aware Recovery

- **What**: Use regen when idle (free), potions when under combat pressure (fast but costs gold)
- **MVP**: Pressure detected via `character.targets > 0` OR hostile entities in ctx.world. Should drive up prioritization however regen is still the preferred recovery mechanism
- **End-state**: Finer-grained context — "about to enter combat" (near farm zone, objective is farm) should pre-regen to full before engaging. "Just finished combat" with no new targets should regen rather than potion. Better potion priority strategy to account for address actual needs and delineate when regen wont cut it and potions should be used
- **Notes**: Currently implemented. The pressure detection is conservative (any hostile nearby = pressure).

## Adaptive Cooldown Scheduling

- **What**: Schedule next recovery tick at cooldown expiry rather than fixed interval
- **MVP**: Returns `{ delay: parent.next_skill.use_hp - Date.now() + 10 }` after each action. Minimum 50ms floor.
- **End-state**: Same — this is optimal scheduling for the recovery cooldown group.
- **Notes**: Currently implemented.

## Elixirs and Consumable Buffs

- **What**: Use non-potion consumables that affect character stats (XP boosts, damage buffs, luck potions, etc.)
- **MVP**: Not needed. Beyond scope of HP/MP recovery.
- **End-state**: Situational use integrated into recovery/sustain system. Some elixirs may be always-on for certain characters, others situational for combat edges (too expensive for sustained use). May compete for the same cooldown/scheduling as potions — needs verification.
- **Notes**: Elixir use is post-MVP. Exact mechanics and cooldown interactions not yet explored.
