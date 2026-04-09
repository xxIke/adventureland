/**
 * Targeting — selects attack and heal targets using a tiered priority system
 * driven by pluggable strategies.
 *
 * Target selection uses priority tiers: hostile players > hostile monsters >
 * farm targets > special monsters > easy kills. Strategies (melee, ranged, heal)
 * build tier lists appropriate to the current objective mode, and the tier selector
 * picks the nearest entity from the highest non-empty tier. Current target is
 * sticky within its tier to avoid rapid switching.
 *
 * Writes `ctx.targeting.attackTarget` and `ctx.targeting.healTarget` each tick.
 * Emits `targeting:changed` on the bus when selections change.
 */

/** Returns the entity nearest to the character from a list. */
function nearest(entities) {
  let best = null;
  let bestDist = Infinity;
  for (const e of entities) {
    const d = distance(character, e);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

/** Returns the nearest entity with no aggro, falling back to the nearest overall. */
function nearestUnclaimed(entities) {
  let best = null;
  let bestDist = Infinity;
  let fallback = null;
  let fallbackDist = Infinity;
  for (const e of entities) {
    const d = distance(character, e);
    if (e.targets === 0 || e.targets === undefined) {
      if (d < bestDist) { bestDist = d; best = e; }
    } else {
      if (d < fallbackDist) { fallbackDist = d; fallback = e; }
    }
  }
  return best || fallback;
}

function entityInTier(entity, tier) {
  if (!entity || !tier || !tier.length) return false;
  for (const e of tier) {
    if (e.id === entity.id) return true;
  }
  return false;
}

/**
 * Selects a target from an ordered list of priority tiers.
 *
 * If the current target is in an equal-or-higher tier, it's kept (sticky targeting).
 * For lower-priority tiers (index >= 2), uses `nearestUnclaimed` to spread aggro
 * when `dedup` is true.
 */
function selectFromTiers(tiers, currentTarget, dedup) {
  let currentTierIndex = -1;
  if (currentTarget) {
    for (let i = 0; i < tiers.length; i++) {
      if (entityInTier(currentTarget, tiers[i])) {
        currentTierIndex = i;
        break;
      }
    }
  }

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (!tier || !tier.length) continue;

    if (currentTarget && currentTierIndex >= 0 && currentTierIndex <= i) {
      return currentTarget;
    }

    if (dedup && i >= 2) {
      return nearestUnclaimed(tier);
    }
    return nearest(tier);
  }

  return null;
}

/** Builds priority tier arrays from world model data based on the current objective mode. */
function buildTiers(ctx, mode) {
  const world = ctx.world || {};
  const config = ctx.config || {};

  const hostilePlayers = (config.toggles?.pvpDefense) ? (world.hostilePlayers || []) : [];
  const hostileMonsters = world.hostileMonsters || [];
  const targetMonsters = world.targetMonsters || [];
  const specialMonsters = world.specialMonsters || [];
  const easyMonsters = world.easyMonsters || [];

  if (mode === 'farm') {
    return [hostilePlayers, hostileMonsters, targetMonsters, specialMonsters, easyMonsters];
  }
  if (mode === 'travel') {
    return [hostilePlayers, hostileMonsters];
  }
  if (mode === 'recover' || mode === 'idle') {
    return [hostilePlayers, hostileMonsters];
  }
  return [hostilePlayers, hostileMonsters];
}

/**
 * Creates a melee targeting strategy — selects the nearest target using standard tiers.
 *
 * @returns {{ name: string, evaluate: Function }}
 */
export function createMeleeTargetingStrategy() {
  return {
    name: 'melee',
    evaluate(ctx, currentState) {
      const mode = ctx.objective?.type || 'farm';
      const tiers = buildTiers(ctx, mode);
      const target = selectFromTiers(tiers, currentState.attackTarget, true);
      return { attackTarget: target, healTarget: null };
    },
  };
}

/**
 * Creates a ranged targeting strategy — includes easy monsters during travel
 * mode since ranged characters can tag them without stopping.
 *
 * @returns {{ name: string, evaluate: Function }}
 */
export function createRangedTargetingStrategy() {
  return {
    name: 'ranged',
    evaluate(ctx, currentState) {
      const mode = ctx.objective?.type || 'farm';
      const world = ctx.world || {};
      const config = ctx.config || {};

      let tiers;
      if (mode === 'travel') {
        const hostilePlayers = (config.toggles?.pvpDefense) ? (world.hostilePlayers || []) : [];
        const hostileMonsters = world.hostileMonsters || [];
        const easyMonsters = world.easyMonsters || [];
        tiers = [hostilePlayers, hostileMonsters, easyMonsters];
      } else {
        tiers = buildTiers(ctx, mode);
      }

      const target = selectFromTiers(tiers, currentState.attackTarget, true);
      return { attackTarget: target, healTarget: null };
    },
  };
}

/**
 * Creates a heal targeting strategy for priest characters.
 *
 * Selects the party member with the most missing HP, gated by a minimum threshold
 * (80% of heal power or below 75% max HP) to avoid wasting heals on chip damage.
 * Sticky to the current heal target if it still qualifies.
 *
 * @returns {{ name: string, evaluate: Function }}
 */
export function createHealTargetingStrategy() {
  return {
    name: 'heal',
    evaluate(ctx, currentState) {
      if (!character.heal || character.heal <= 0) {
        return { attackTarget: null, healTarget: null };
      }

      const partyMembers = ctx.world?.partyMembers || [];
      let bestTarget = null;
      let bestMissing = 0;

      for (const member of partyMembers) {
        const missing = member.max_hp - member.hp;
        if (missing <= 0) continue;

        const qualifies =
          missing >= character.heal * 0.8 ||
          member.hp < member.max_hp * 0.75;

        if (!qualifies) continue;

        if (missing > bestMissing) {
          bestMissing = missing;
          bestTarget = member;
        }
      }

      if (currentState.healTarget && bestTarget) {
        const currentMissing = currentState.healTarget.max_hp - currentState.healTarget.hp;
        const currentQualifies =
          currentMissing >= character.heal * 0.8 ||
          currentState.healTarget.hp < currentState.healTarget.max_hp * 0.75;
        if (currentQualifies && currentMissing > 0) {
          bestTarget = currentState.healTarget;
        }
      }

      return { attackTarget: null, healTarget: bestTarget };
    },
  };
}

/**
 * Creates the targeting system that evaluates strategies each tick and writes results to `ctx.targeting`.
 *
 * Strategies are evaluated in order; the first to return a heal target wins immediately
 * (heal priority), otherwise the first attack target is used. Targets are validated
 * each tick — dead or out-of-sight entities are automatically cleared.
 *
 * @param {object} ctx - Shared context with `targeting`, `world`, `objective`, `config`, `bus`, `logger`
 * @param {Array<object>} strategies - Ordered list of targeting strategies to evaluate
 * @returns {{ tick: Function, getAttackTarget: Function, getHealTarget: Function, getState: Function }}
 */
export function createTargeting(ctx, strategies) {
  let attackTarget = null;
  let healTarget = null;
  const strategyNames = strategies.map(s => s.name).join('+');

  function emitChanged(previous, current, type, reason) {
    ctx.bus.emit('targeting:changed', { previous, current, type, reason });
    if (current) {
      ctx.logger.info('targeting', `${type}: ${current.name || current.mtype} (${reason})`);
    } else {
      ctx.logger.debug('targeting', `${type} cleared (${reason})`);
    }
  }

  function clearTarget(field, reason) {
    if (field === 'attack' && attackTarget) {
      const prev = attackTarget;
      attackTarget = null;
      emitChanged(prev, null, 'attack', reason);
    }
    if (field === 'heal' && healTarget) {
      const prev = healTarget;
      healTarget = null;
      emitChanged(prev, null, 'heal', reason);
    }
  }

  function validateTarget(target, field) {
    if (!target) return null;
    if (target.dead || target.rip) {
      clearTarget(field, 'died');
      return null;
    }
    if (!target.visible || !parent.entities[target.id]) {
      clearTarget(field, 'lost');
      return null;
    }
    return target;
  }

  function tick() {
    try {
      if (character.rip) {
        if (attackTarget) clearTarget('attack', 'cleared');
        if (healTarget) clearTarget('heal', 'cleared');
        ctx.targeting.attackTarget = null;
        ctx.targeting.healTarget = null;
        ctx.targeting.lastUpdated = Date.now();
        return;
      }

      attackTarget = validateTarget(attackTarget, 'attack');
      healTarget = validateTarget(healTarget, 'heal');

      const currentState = { attackTarget, healTarget };
      let newAttack = null;
      let newHeal = null;

      for (const strategy of strategies) {
        try {
          const result = strategy.evaluate(ctx, currentState);
          if (result.healTarget) {
            newHeal = result.healTarget;
            newAttack = null;
            break;
          }
          if (result.attackTarget) {
            newAttack = result.attackTarget;
            break;
          }
        } catch (e) {
          ctx.logger.error('targeting', `${strategy.name} evaluate error: ${e.message}`);
        }
      }

      if (newAttack !== attackTarget) {
        const prev = attackTarget;
        attackTarget = newAttack;
        if (newAttack) {
          const reason = prev ? 'priority' : 'selected';
          emitChanged(prev, newAttack, 'attack', reason);
        } else if (prev) {
          emitChanged(prev, null, 'attack', 'cleared');
        }
      }

      if (newHeal !== healTarget) {
        const prev = healTarget;
        healTarget = newHeal;
        if (newHeal) {
          const reason = prev ? 'priority' : 'selected';
          emitChanged(prev, newHeal, 'heal', reason);
        } else if (prev) {
          emitChanged(prev, null, 'heal', prev.hp >= prev.max_hp ? 'healed' : 'cleared');
        }
      }

      ctx.targeting.attackTarget = attackTarget;
      ctx.targeting.healTarget = healTarget;
      ctx.targeting.lastUpdated = Date.now();
    } catch (e) {
      ctx.logger.error('targeting', `tick error: ${e.message}`);
    }
  }

  return {
    tick,
    getAttackTarget() { return attackTarget; },
    getHealTarget() { return healTarget; },
    getState() {
      return {
        attackTarget,
        healTarget,
        state: (attackTarget || healTarget) ? 'targeting' : 'idle',
        strategyName: strategyNames,
      };
    },
  };
}
