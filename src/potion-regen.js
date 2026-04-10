/**
 * Potion/regen — manages HP and MP recovery by selecting between potions and regen skills.
 *
 * When idle (no threats), uses regen skills for efficient recovery. Under combat pressure,
 * selects the appropriate potion tier based on the deficit amount vs potion restoration
 * value from G.items, falling back through lower tiers if the ideal potion is unavailable.
 * The game's `use_hp`/`use_mp` skills consume the last potion of that type in inventory,
 * so this system swaps the desired potion to that position before use.
 *
 * Shares a cooldown group with regen skills (`parent.next_skill.use_hp`), so only one
 * recovery action can fire per cooldown window.
 */

const HP_POTION_NAMES = ['hpot0', 'hpot1', 'hpotx'];
const MP_POTION_NAMES = ['mpot0', 'mpot1', 'mpotx'];

// Server-fixed values (G.skills.regen_hp/regen_mp.explanation)
const HP_REGEN_AMOUNT = 50;
const MP_REGEN_AMOUNT = 100;

/** Lazily-built potion registries — populated from G.items on first access. */
let _hpPotions = null;
let _mpPotions = null;

/**
 * Builds a sorted potion list from G.items data.
 * @param {string[]} names - Potion item names
 * @returns {{ name: string, gives: number }[]} Sorted descending by restoration value
 */
function buildPotionList(names) {
  return names
    .map(name => ({ name, gives: G.items[name].gives[0][1] }))
    .sort((a, b) => b.gives - a.gives);
}

function getHpPotions() {
  if (!_hpPotions) _hpPotions = buildPotionList(HP_POTION_NAMES);
  return _hpPotions;
}

function getMpPotions() {
  if (!_mpPotions) _mpPotions = buildPotionList(MP_POTION_NAMES);
  return _mpPotions;
}

/**
 * Selects the largest potion whose restoration value <= missing amount.
 * Maximizes recovery per cooldown without wasting restoration value.
 * @param {number} missing - Amount of HP or MP missing
 * @param {{ name: string, gives: number }[]} potionList - Sorted descending by gives
 * @returns {{ name: string, gives: number } | null} Selected potion or null if deficit too small
 */
function selectPotion(missing, potionList) {
  for (const entry of potionList) {
    if (entry.gives <= missing) return entry;
  }
  return null;
}

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

/**
 * Creates the potion/regen system that manages HP and MP recovery each tick.
 *
 * @param {object} ctx - Shared context with `world`, `config`, `logger`
 * @returns {{ tick: Function }}
 */
export function createPotionRegen(ctx) {
  let potionInFlight = false;

  function cooldownDelay() {
    const cd = parent.next_skill?.use_hp ?? (Date.now() + 200);
    return { delay: Math.max(50, cd - Date.now() + 10) };
  }

  function tick() {
    try {
      if (character.rip) return { delay: 1000 };
      if (potionInFlight) return cooldownDelay();

      const nextUseHp = parent.next_skill?.use_hp;
      if (nextUseHp && Date.now() < nextUseHp) return cooldownDelay();

      const missingHp = character.max_hp - character.hp;
      const missingMp = character.max_mp - character.mp;
      if (missingHp <= 0 && missingMp <= 0) return { delay: 250 };

      const underPressure = character.targets > 0
        || (ctx.world.hostileMonsters || []).length > 0
        || (ctx.world.hostilePlayers || []).length > 0;

      // Determine recovery action for each resource
      const hpAction = resolveAction(missingHp, HP_REGEN_AMOUNT, getHpPotions(), underPressure);
      const mpAction = resolveAction(missingMp, MP_REGEN_AMOUNT, getMpPotions(), underPressure);

      // Pick which resource to recover based on urgency (missing percentage)
      // MP wins ties — needed for all actions including basic attacks
      let action = null;
      let actionType = null;

      if (hpAction && mpAction) {
        const hpUrgency = missingHp / character.max_hp;
        const mpUrgency = missingMp / character.max_mp;
        if (hpUrgency > mpUrgency) {
          action = hpAction;
          actionType = 'hp';
        } else {
          action = mpAction;
          actionType = 'mp';
        }
      } else if (hpAction) {
        action = hpAction;
        actionType = 'hp';
      } else if (mpAction) {
        action = mpAction;
        actionType = 'mp';
      } else {
        return { delay: 250 };
      }

      if (action.method === 'potion') {
        potionInFlight = true;
        executePotion(actionType, action.potion).finally(() => { potionInFlight = false; });
      } else {
        const skill = actionType === 'hp' ? 'regen_hp' : 'regen_mp';
        use_skill(skill).catch(e => ctx.logger.debug('potion-regen', `${skill} failed: ${e.message}`));
        ctx.logger.debug('potion-regen', `${skill} (missing ${actionType === 'hp' ? missingHp : missingMp})`);
      }
      return cooldownDelay();
    } catch (e) {
      ctx.logger.error('potion-regen', `tick error: ${e.message}`);
      return { delay: 500 };
    }
  }

  /**
   * Determines the recovery action for a single resource.
   * @param {number} missing - Amount missing
   * @param {number} regenAmount - How much regen restores
   * @param {{ name: string, gives: number }[]} potionList - Available potion tiers
   * @param {boolean} underPressure - Whether in combat
   * @returns {{ method: 'potion', potion: string } | { method: 'regen' } | null}
   */
  function resolveAction(missing, regenAmount, potionList, underPressure) {
    if (missing < regenAmount) return null;

    const selected = selectPotion(missing, potionList);

    // GROWTH: When party healer availability is implemented, check here
    // whether a healer can cover this deficit. If so, skip self-recovery
    // to avoid wasting the shared cooldown.

    if (!selected) return { method: 'regen' };
    if (!underPressure) return { method: 'regen' };
    return { method: 'potion', potion: selected.name };
  }

  async function executePotion(type, desiredPotion) {
    const items = character.items;
    const potionNames = (type === 'hp' ? getHpPotions() : getMpPotions()).map(p => p.name);
    const skillName = type === 'hp' ? 'use_hp' : 'use_mp';

    // Find if desired potion exists
    const desiredSlot = findPotionSlot(items, desiredPotion);

    if (desiredSlot >= 0) {
      // Desired potion exists — ensure it's the last of its type
      const last = findLastPotionSlot(items, potionNames);
      if (last.slot !== desiredSlot && last.slot >= 0) {
        try {
          await swap(desiredSlot, last.slot);
        } catch (e) {
          ctx.logger.warn('potion-regen', `swap failed: ${e.message}, using last potion as-is`);
        }
      }
      use_skill(skillName).catch(() => {});
      ctx.logger.debug('potion-regen', `${skillName} -> ${desiredPotion}`);
      return;
    }

    // Desired tier unavailable — fallback to weaker (cheaper) tiers only, never stronger
    const desiredIdx = potionNames.indexOf(desiredPotion);
    for (let i = desiredIdx + 1; i < potionNames.length; i++) {
      const name = potionNames[i];
      if (findPotionSlot(items, name) >= 0) {
        const fallbackSlot = findPotionSlot(items, name);
        const last = findLastPotionSlot(items, potionNames);
        if (last.slot !== fallbackSlot && last.slot >= 0) {
          try { await swap(fallbackSlot, last.slot); } catch (e) { ctx.logger.debug('potion-regen', `swap fallback failed: ${e.message}`); }
        }
        use_skill(skillName).catch(e => ctx.logger.debug('potion-regen', `${skillName} fallback failed: ${e.message}`));
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
