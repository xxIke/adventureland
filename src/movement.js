/**
 * Movement — state-machine-driven positioning with modes for combat, travel, flee, and idle.
 *
 * Mode detection runs each tick: flee triggers at low HP with active threats,
 * combat engages when targeting has a target, travel activates when the objective
 * specifies a distant location. The strategy object handles the actual movement
 * API calls (approach, kite, flee, travel) so the mode logic stays independent
 * of movement implementation.
 */

import { openStand, closeStand, isStandOpen } from './utils.js';

/** Default tick delay for combat movement calculations (ms). */
const COMBAT_DELAY = 200;

/**
 * Find the nearest hostile entity targeting this character.
 * Iterates all entities to find the closest one with target === character.name.
 * @returns {object|null} nearest hostile entity, or null
 */
function findNearestHostileTargetingMe() {
  let nearest = null;
  let nearestDist = Infinity;
  for (const id in parent.entities) {
    const e = parent.entities[id];
    if (e && e.target === character.name && !e.dead && e.visible) {
      const d = distance(character, e);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = e;
      }
    }
  }
  return nearest;
}

/**
 * Creates a movement strategy using the game's `smart_move` for long-distance
 * travel and direct `move` calls for combat positioning.
 *
 * Kiting steers up to ±90° from the attacker's movement vector while maintaining
 * range with the attack/heal target and validating destinations with can_move_to().
 * Vector length = character.speed * (delay / 1000) per contract.
 *
 * @returns {{ name: string, travel: Function, approach: Function, kite: Function, flee: Function }}
 */
export function createSmartMoveStrategy() {
  return {
    name: 'smart-move',

    travel(destination) {
      stop();
      return smart_move(destination);
    },

    approach(target) {
      if (!target) return;
      const tx = target.real_x ?? target.x;
      const ty = target.real_y ?? target.y;
      const dist = distance(character, target);
      if (dist <= character.range) return;

      const dx = tx - character.real_x;
      const dy = ty - character.real_y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const moveDist = Math.min(character.speed * (COMBAT_DELAY / 1000), dist - character.range);
      move(character.real_x + (dx / len) * moveDist, character.real_y + (dy / len) * moveDist);
    },

    kite(target, attackerEntity) {
      if (!target || !attackerEntity) return;

      const step = character.speed * (COMBAT_DELAY / 1000);

      // Determine attacker's movement vector
      let avx, avy;
      if (attackerEntity.moving && attackerEntity.going_x !== undefined) {
        avx = attackerEntity.going_x - (attackerEntity.real_x ?? attackerEntity.x);
        avy = attackerEntity.going_y - (attackerEntity.real_y ?? attackerEntity.y);
      } else {
        // Attacker not moving — use vector from attacker toward character as base
        avx = character.real_x - (attackerEntity.real_x ?? attackerEntity.x);
        avy = character.real_y - (attackerEntity.real_y ?? attackerEntity.y);
      }
      const avLen = Math.sqrt(avx * avx + avy * avy) || 1;
      avx /= avLen;
      avy /= avLen;

      // Target position for range maintenance
      const tx = target.real_x ?? target.x;
      const ty = target.real_y ?? target.y;
      const distToTarget = distance(character, target);

      // Try angles from 0° to ±90° from attacker vector, find valid move
      const angles = [0, Math.PI / 6, -Math.PI / 6, Math.PI / 4, -Math.PI / 4, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2];
      let bestX = null;
      let bestY = null;
      let bestScore = -Infinity;

      for (const angle of angles) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dirX = avx * cos - avy * sin;
        const dirY = avx * sin + avy * cos;

        const destX = character.real_x + dirX * step;
        const destY = character.real_y + dirY * step;

        if (!can_move_to(destX, destY)) continue;

        // Score: prefer directions that maintain range with attack/heal target
        const dx = tx - destX;
        const dy = ty - destY;
        const newDistToTarget = Math.sqrt(dx * dx + dy * dy);
        const rangeOk = newDistToTarget <= character.range;
        const score = rangeOk ? (1000 - Math.abs(angle)) : (-newDistToTarget);

        if (score > bestScore) {
          bestScore = score;
          bestX = destX;
          bestY = destY;
        }
      }

      if (bestX !== null) {
        move(bestX, bestY);
      } else if (distToTarget > character.range) {
        // Can't kite safely — approach target instead
        const dx = tx - character.real_x;
        const dy = ty - character.real_y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const moveDist = Math.min(step, distToTarget - character.range);
        move(character.real_x + (dx / len) * moveDist, character.real_y + (dy / len) * moveDist);
      }
    },

    flee(hostiles) {
      if (!hostiles || hostiles.length === 0) return;
      let ax = 0;
      let ay = 0;
      for (const h of hostiles) {
        ax += (h.real_x ?? h.x);
        ay += (h.real_y ?? h.y);
      }
      ax /= hostiles.length;
      ay /= hostiles.length;

      const dx = character.real_x - ax;
      const dy = character.real_y - ay;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const step = character.speed * (COMBAT_DELAY / 1000);
      move(character.real_x + (dx / len) * step, character.real_y + (dy / len) * step);
    },
  };
}

/**
 * Creates the movement system with mode-based tick dispatching.
 *
 * Modes: `idle` (no movement), `combat` (approach or kite), `travel` (smart_move
 * to objective location with retry logic), `flee` (run from hostiles at low HP).
 * Non-tank characters (and ranged characters even if tank) kite when they have aggro.
 *
 * Merchant characters have stand lifecycle management: close before any movement,
 * open after travel arrival.
 *
 * @param {object} ctx - Shared context with `targeting`, `objective`, `party`, `config`, `world`, `logger`
 * @param {object} strategy - Movement strategy implementing travel/approach/kite/flee
 * @returns {{ tick: Function, stop: Function, getState: Function }}
 */
export function createMovement(ctx, strategy) {
  let mode = 'idle';
  let travelPromise = null;
  let destination = null;
  let retryCount = 0;
  let retryTimer = null;
  let nullTargetTicks = 0;
  const isMerchant = ctx.config.roster?.self?.isMerchant;

  function cancelTravel() {
    try { stop(); } catch (e) { ctx.logger.debug('movement', `stop failed: ${e.message}`); }
    travelPromise = null;
  }

  function ensureStandClosed() {
    if (isMerchant && isStandOpen()) {
      closeStand();
      ctx.logger.debug('movement', 'Closed stand before movement');
    }
  }

  function detectMode() {
    if (character.rip) return 'idle';

    if (character.targets > 0 &&
        character.hp / character.max_hp < ctx.config.thresholds.fleeHpPercent) {
      return 'flee';
    }

    const at = ctx.targeting?.attackTarget;
    const ht = ctx.targeting?.healTarget;
    if (at || ht) {
      nullTargetTicks = 0;
      return 'combat';
    }

    if (mode === 'combat') {
      nullTargetTicks++;
      if (nullTargetTicks < 2) return 'combat';
    }

    const coord = ctx.objective?.location?.coord;
    if (coord && coord.map) {
      if (coord.map !== character.map) return 'travel';
      const dx = (coord.x || 0) - character.real_x;
      const dy = (coord.y || 0) - character.real_y;
      if (Math.sqrt(dx * dx + dy * dy) > 50) return 'travel';
    }

    return 'idle';
  }

  function isPartyTank() {
    const tank = ctx.party?.tank;
    if (!tank) return true;
    return character.name === tank;
  }

  function tickFlee() {
    if (character.hp / character.max_hp > ctx.config.thresholds.fleeHpPercent * 1.5) {
      ctx.logger.info('movement', 'Flee ended — HP recovered');
      return null;
    }

    ensureStandClosed();

    const hostiles = [
      ...(ctx.world.hostileMonsters || []),
      ...(ctx.world.hostilePlayers || []),
    ];
    try {
      strategy.flee(hostiles);
    } catch (e) {
      ctx.logger.error('movement', `flee error: ${e.message}`);
    }
    return { delay: 100 };
  }

  function tickCombat() {
    const target = ctx.targeting?.healTarget || ctx.targeting?.attackTarget;
    if (!target) {
      return { delay: 200 };
    }

    ensureStandClosed();

    const shouldKite = character.targets > 0 && (!isPartyTank() || character.range > 30);

    if (shouldKite) {
      const attacker = findNearestHostileTargetingMe();
      if (attacker) {
        try {
          strategy.kite(target, attacker);
        } catch (e) {
          ctx.logger.error('movement', `kite error: ${e.message}`);
        }
      } else {
        // Being targeted but can't find attacker — approach target
        const dist = distance(character, target);
        if (dist > character.range) {
          try { strategy.approach(target); } catch (e) { ctx.logger.debug('movement', `approach fallback failed: ${e.message}`); }
        }
      }
    } else {
      const dist = distance(character, target);
      if (dist > character.range) {
        try {
          strategy.approach(target);
        } catch (e) {
          ctx.logger.error('movement', `approach error: ${e.message}`);
        }
      }
    }

    return { delay: 200 };
  }

  function tickTravel() {
    const coord = ctx.objective?.location?.coord;
    if (!coord) {
      return null;
    }

    if (travelPromise) return { delay: 1000 };

    if (retryTimer && Date.now() < retryTimer) return { delay: 1000 };
    retryTimer = null;

    ensureStandClosed();

    destination = coord;

    // Party travel sync: apply speed cap via cruise() if active
    const travelSync = ctx.party?.travelSync;
    if (travelSync?.active && travelSync.slowestSpeed) {
      try { cruise(travelSync.slowestSpeed); } catch (e) { /* cruise unavailable */ }
      ctx.logger.info('movement', `Traveling to ${JSON.stringify(coord)} (cruise speed: ${travelSync.slowestSpeed})`);
    } else {
      ctx.logger.info('movement', `Traveling to ${JSON.stringify(coord)}`);
    }

    travelPromise = strategy.travel(coord);
    travelPromise.then(() => {
      ctx.logger.info('movement', 'Travel complete');
      travelPromise = null;
      destination = null;
      retryCount = 0;
      try { cruise(500); } catch (e) { /* reset cruise */ }
      if (isMerchant) {
        openStand();
        ctx.logger.debug('movement', 'Opened stand after travel arrival');
      }
    }).catch((e) => {
      travelPromise = null;
      retryCount++;
      try { cruise(500); } catch (e2) { /* reset cruise */ }
      if (retryCount > 3) {
        ctx.logger.error('movement', `Travel failed after 3 retries: ${e?.message || e}`);
        destination = null;
        retryCount = 0;
      } else {
        ctx.logger.warn('movement', `Travel failed (attempt ${retryCount}/3), retrying in 2s`);
        retryTimer = Date.now() + 2000;
      }
    });

    return { delay: 1000 };
  }

  function tick() {
    try {
      const newMode = detectMode();

      if (newMode !== mode) {
        if (mode === 'travel' && newMode !== 'travel' && travelPromise) {
          cancelTravel();
        }
        mode = newMode;
      }

      switch (mode) {
        case 'flee': {
          const result = tickFlee();
          if (!result) { mode = 'idle'; return { delay: 250 }; }
          return result;
        }
        case 'combat':
          return tickCombat();
        case 'travel': {
          const result = tickTravel();
          if (!result) { mode = 'idle'; return { delay: 500 }; }
          return result;
        }
        default:
          return { delay: 500 };
      }
    } catch (e) {
      ctx.logger.error('movement', `tick error: ${e.message}`);
      return { delay: 500 };
    }
  }

  function stopMovement() {
    cancelTravel();
    mode = 'idle';
    destination = null;
    retryCount = 0;
    retryTimer = null;
    nullTargetTicks = 0;
  }

  return {
    tick,
    stop: stopMovement,
    getState() {
      return { mode, destination, strategyName: strategy.name };
    },
  };
}
