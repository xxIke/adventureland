/**
 * Potion/regen — manages HP and MP recovery by selecting between potions and regen skills.
 *
 * When idle (no threats), uses regen skills for efficient recovery. Under combat pressure,
 * selects the appropriate potion tier based on the deficit amount, falling back through
 * lower tiers if the ideal potion is unavailable. The game's `use_hp`/`use_mp` skills
 * consume the last potion of that type in inventory, so this system swaps the desired
 * potion to that position before use.
 *
 * Shares a cooldown group with regen skills (`parent.next_skill.use_hp`), so only one
 * recovery action can fire per cooldown window.
 */

/** Potion item names ordered from strongest to weakest. */
const HP_POTIONS = ['hpotx', 'hpot1', 'hpot0'];
/** @type {string[]} */
const MP_POTIONS = ['mpotx', 'mpot1', 'mpot0'];

/** Maps missing HP thresholds to the appropriate potion tier. */
const HP_TIERS = [
  { threshold: 10000, potion: 'hpotx' },
  { threshold: 800, potion: 'hpot1' },
  { threshold: 400, potion: 'hpot0' },
];

/** Maps missing MP thresholds to the appropriate potion tier. */
const MP_TIERS = [
  { threshold: 10000, potion: 'mpotx' },
  { threshold: 1000, potion: 'mpot1' },
  { threshold: 500, potion: 'mpot0' },
];

/** Finds the last inventory slot containing any potion from the given list. */
function findLastPotionSlot(items, potionNames) {
  let lastSlot = -1;
  let lastName = null;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item && potionNames.includes(item.name)) {
      lastSlot = i;
      lastName = item.name;
    }
  }
  return { slot: lastSlot, name: lastName };
}

function findPotionSlot(items, potionName) {
  for (let i = 0; i < items.length; i++) {
    if (items[i] && items[i].name === potionName) return i;
  }
  return -1;
}

function selectHpTier(missing) {
  for (const tier of HP_TIERS) {
    if (missing > tier.threshold) return tier.potion;
  }
  return null; // Missing amount too small for potions — use regen
}

function selectMpTier(missing) {
  for (const tier of MP_TIERS) {
    if (missing > tier.threshold) return tier.potion;
  }
  return null;
}

/**
 * Creates the potion/regen system that manages HP and MP recovery each tick.
 *
 * @param {object} ctx - Shared context with `world`, `config`, `logger`
 * @returns {{ tick: Function }}
 */
export function createPotionRegen(ctx) {
  function cooldownDelay() {
    return { delay: Math.max(50, parent.next_skill.use_hp - Date.now() + 10) };
  }

  function tick() {
    try {
      if (character.rip) return { delay: 1000 };

      if (Date.now() < parent.next_skill.use_hp) return cooldownDelay();

      const missingHp = character.max_hp - character.hp;
      const missingMp = character.max_mp - character.mp;
      if (missingHp <= 0 && missingMp <= 0) return { delay: 250 };

      const underPressure = character.targets > 0
        || (ctx.world.hostileMonsters || []).length > 0
        || (ctx.world.hostilePlayers || []).length > 0;

      if (!underPressure) {
        if (missingHp > 0) {
          use_skill('regen_hp').catch(e => ctx.logger.debug('potion-regen', `regen_hp failed: ${e.message}`));
          ctx.logger.debug('potion-regen', `regen_hp (idle, missing ${missingHp})`);
        } else if (missingMp > 0) {
          use_skill('regen_mp').catch(e => ctx.logger.debug('potion-regen', `regen_mp failed: ${e.message}`));
          ctx.logger.debug('potion-regen', `regen_mp (idle, missing ${missingMp})`);
        }
        return cooldownDelay();
      }

      const hpTier = missingHp > 0 ? selectHpTier(missingHp) : null;
      const mpTier = missingMp > 0 ? selectMpTier(missingMp) : null;

      let action;
      if (hpTier && mpTier) {
        action = { type: 'hp', potion: hpTier };
      } else if (hpTier) {
        action = { type: 'hp', potion: hpTier };
      } else if (mpTier) {
        action = { type: 'mp', potion: mpTier };
      } else if (missingHp > 0) {
        action = { type: 'hp', potion: null };
      } else if (missingMp > 0) {
        action = { type: 'mp', potion: null };
      } else {
        return { delay: 250 };
      }

      if (action.potion) {
        executePotion(action.type, action.potion);
      } else {
        const skill = action.type === 'hp' ? 'regen_hp' : 'regen_mp';
        use_skill(skill).catch(() => {});
        ctx.logger.debug('potion-regen', `${skill} (combat, small deficit)`);
      }
      return cooldownDelay();
    } catch (e) {
      ctx.logger.error('potion-regen', `tick error: ${e.message}`);
      return { delay: 500 };
    }
  }

  function executePotion(type, desiredPotion) {
    const items = character.items;
    const potionList = type === 'hp' ? HP_POTIONS : MP_POTIONS;
    const skillName = type === 'hp' ? 'use_hp' : 'use_mp';

    // Find if desired potion exists
    const desiredSlot = findPotionSlot(items, desiredPotion);

    if (desiredSlot >= 0) {
      // Desired potion exists — ensure it's the last of its type
      const last = findLastPotionSlot(items, potionList);
      if (last.slot !== desiredSlot && last.slot >= 0) {
        // Swap desired to the last potion position so use_skill consumes it
        try {
          swap(desiredSlot, last.slot);
        } catch (e) {
          ctx.logger.warn('potion-regen', `swap failed: ${e.message}, using last potion as-is`);
        }
      }
      use_skill(skillName).catch(() => {});
      ctx.logger.debug('potion-regen', `${skillName} -> ${desiredPotion}`);
      return;
    }

    // Desired tier unavailable — fallback to next available tier
    for (const name of potionList) {
      if (findPotionSlot(items, name) >= 0) {
        // Found a fallback — make sure it's last
        const fallbackSlot = findPotionSlot(items, name);
        const last = findLastPotionSlot(items, potionList);
        if (last.slot !== fallbackSlot && last.slot >= 0) {
          try { swap(fallbackSlot, last.slot); } catch (e) { /* best effort */ }
        }
        use_skill(skillName).catch(() => {});
        ctx.logger.debug('potion-regen', `${skillName} -> ${name} (fallback from ${desiredPotion})`);
        return;
      }
    }

    // No potions at all — use regen
    const regenSkill = type === 'hp' ? 'regen_hp' : 'regen_mp';
    use_skill(regenSkill).catch(() => {});
    ctx.logger.warn('potion-regen', `no ${type} potions, using ${regenSkill}`);
  }

  return { tick };
}
