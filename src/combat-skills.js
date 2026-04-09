/**
 * Combat skills — delegates class-specific skill usage to a pluggable strategy.
 *
 * The system itself only gates on "alive and has a target"; the strategy decides
 * which skills to fire and their cooldown delays. This allows class-specific
 * strategies (warrior, mage, priest, etc.) to be swapped without changing the tick loop.
 */

/**
 * Creates a no-op skill strategy that does nothing. Used as a placeholder
 * until class-specific strategies are implemented.
 *
 * @returns {{ name: string, useSkills: Function }}
 */
export function createNoOpSkillStrategy() {
  return {
    name: 'none',
    useSkills() {
      return { delay: 2000 };
    },
  };
}

/**
 * Creates the combat skills system that delegates to the provided strategy each tick.
 *
 * @param {object} ctx - Shared context with `targeting`, `logger`
 * @param {object} strategy - Skill strategy with `useSkills(ctx)` method
 * @returns {{ tick: Function }}
 */
export function createCombatSkills(ctx, strategy) {
  function tick() {
    try {
      if (character.rip) return { delay: 1000 };

      if (!ctx.targeting?.attackTarget) return { delay: 1000 };

      const result = strategy.useSkills(ctx);
      return result && result.delay ? result : { delay: 500 };
    } catch (e) {
      ctx.logger.error('combat-skills', `tick error: ${e.message}`);
      return { delay: 500 };
    }
  }

  return { tick };
}
