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
 * Creates a priest skill strategy that uses partyheal when 2+ party members
 * are below 80% HP.
*
* @returns {{ name: string, useSkills: Function }}
*/
export function createPriestSkillStrategy() {
  return {
    name: 'priest',
    useSkills(ctx) {
      if (is_on_cooldown('partyheal')) {
        const remaining = parent.next_skill.partyheal
          ? Math.max(0, parent.next_skill.partyheal - Date.now())
          : 500;
        return { delay: remaining + 50 };
      }

      const partyMembers = ctx.world?.partyMembers || [];
      let injured = 0;
      for (const m of partyMembers) {
        if (!m) continue;
        if (m.hp < m.max_hp * 0.8) injured++;
      }

      if (injured >= 2) {
        use_skill('partyheal').catch(e =>
          ctx.logger.debug('combat-skills', `partyheal failed: ${e.message}`)
        );
        ctx.logger.debug('combat-skills', `partyheal (${injured} injured)`);
      }

      return { delay: 500 };
    },
  };
}

/**
 * Creates a paladin skill strategy that uses selfheal when HP drops below 60%.
*
* @returns {{ name: string, useSkills: Function }}
*/
export function createPaladinSkillStrategy() {
  return {
    name: 'paladin',
    useSkills(ctx) {
      if (is_on_cooldown('selfheal')) {
        const remaining = parent.next_skill.selfheal
          ? Math.max(0, parent.next_skill.selfheal - Date.now())
          : 500;
        return { delay: remaining + 50 };
      }

      if (character.hp < character.max_hp * 0.6) {
        use_skill('selfheal').catch(e =>
          ctx.logger.debug('combat-skills', `selfheal failed: ${e.message}`)
        );
        ctx.logger.debug('combat-skills', 'selfheal (HP < 60%)');
      }

      return { delay: 500 };
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

      const result = strategy.useSkills(ctx);
      return result && result.delay ? result : { delay: 500 };
    } catch (e) {
      ctx.logger.error('combat-skills', `tick error: ${e.message}`);
      return { delay: 500 };
    }
  }

  return { tick };
}
