/**
 * Attack — executes basic attacks and heals against targets selected by the targeting system.
 *
 * Reads `ctx.targeting.attackTarget` and `ctx.targeting.healTarget` each tick.
 * Heal takes priority over attack when both are present and the character has
 * a heal stat. Also opportunistically loots nearby chests. Adaptive delay is
 * based on `character.frequency` (attacks per second).
 */

/**
 * Creates the attack system that consumes targeting decisions to fire attacks/heals.
 *
 * @param {object} ctx - Shared context with `targeting`, `logger`
 * @returns {{ tick: Function }}
 */
export function createAttack(ctx) {
  function tick() {
    try {
      if (character.rip) return { delay: 1000 };

      try {
        if (Object.keys(get_chests()).length > 0) loot();
      } catch (e) { /* loot errors non-critical */ }

      const at = ctx.targeting?.attackTarget;
      const ht = ctx.targeting?.healTarget;

      if (!at && !ht) return { delay: 500 };

      if (ht && character.heal > 0) {
        if (!can_attack(ht)) return { delay: 100 };
        heal(ht).catch(e => ctx.logger.error('attack', `heal failed: ${e.message}`));
        change_target(ht);
        ctx.logger.debug('attack', `heal -> ${ht.name}`);
        return { delay: Math.max(50, Math.floor(1000 / character.frequency)) };
      }

      if (at) {
        if (!can_attack(at)) return { delay: 100 };
        attack(at).catch(e => ctx.logger.error('attack', `attack failed: ${e.message}`));
        change_target(at);
        ctx.logger.debug('attack', `attack -> ${at.name || at.mtype}`);
        return { delay: Math.max(50, Math.floor(1000 / character.frequency)) };
      }

      return { delay: 500 };
    } catch (e) {
      ctx.logger.error('attack', `tick error: ${e.message}`);
      return { delay: 500 };
    }
  }

  return { tick };
}
