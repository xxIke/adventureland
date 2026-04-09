/**
 * Movement — state-machine-driven positioning with modes for combat, travel, flee, and idle.
 *
 * Mode detection runs each tick: flee triggers at low HP with active threats,
 * combat engages when targeting has a target, travel activates when the objective
 * specifies a distant location. The strategy object handles the actual movement
 * API calls (approach, kite, flee, travel) so the mode logic stays independent
 * of movement implementation.
 */

/**
 * Creates a movement strategy using the game's `smart_move` for long-distance
 * travel and direct `move` calls for combat positioning.
 *
 * Kiting uses a weighted vector: 70% away from the hostile, 30% toward the
 * attack target, keeping the character at range while maintaining DPS uptime.
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
      const moveDist = Math.min(character.speed * 0.25, dist - character.range);
      move(character.real_x + (dx / len) * moveDist, character.real_y + (dy / len) * moveDist);
    },

    kite(target, characterRange, hostileRange) {
      if (!target) return;
      const tx = target.moving ? (target.going_x ?? target.real_x) : (target.real_x ?? target.x);
      const ty = target.moving ? (target.going_y ?? target.real_y) : (target.real_y ?? target.y);

      const hostile = findHostileTargetingMe();
      if (!hostile) {
        const dist = distance(character, target);
        if (dist > characterRange) {
          const dx = tx - character.real_x;
          const dy = ty - character.real_y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const moveDist = Math.min(character.speed * 0.25, dist - characterRange);
          move(character.real_x + (dx / len) * moveDist, character.real_y + (dy / len) * moveDist);
        }
        return;
      }

      const hx = hostile.real_x ?? hostile.x;
      const hy = hostile.real_y ?? hostile.y;
      const safeDistance = hostileRange * 1.1;

      const distToHostile = Math.sqrt(
        (character.real_x - hx) ** 2 + (character.real_y - hy) ** 2
      ) || 1;

      if (distToHostile < safeDistance) {
        const awayX = character.real_x - hx;
        const awayY = character.real_y - hy;
        const awayLen = Math.sqrt(awayX * awayX + awayY * awayY) || 1;

        const toTargetX = tx - character.real_x;
        const toTargetY = ty - character.real_y;
        const toTargetLen = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY) || 1;

        const combinedX = (awayX / awayLen) * 0.7 + (toTargetX / toTargetLen) * 0.3;
        const combinedY = (awayY / awayLen) * 0.7 + (toTargetY / toTargetLen) * 0.3;
        const combinedLen = Math.sqrt(combinedX * combinedX + combinedY * combinedY) || 1;

        const step = character.speed * 0.25;
        move(
          character.real_x + (combinedX / combinedLen) * step,
          character.real_y + (combinedY / combinedLen) * step
        );
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
      const step = character.speed;
      move(character.real_x + (dx / len) * step, character.real_y + (dy / len) * step);
    },
  };
}

/** Scans `parent.entities` for the first visible, living entity targeting this character. */
function findHostileTargetingMe() {
  for (const id in parent.entities) {
    const e = parent.entities[id];
    if (e && e.target === character.name && !e.dead && e.visible) {
      return e;
    }
  }
  return null;
}

/**
 * Creates the movement system with mode-based tick dispatching.
 *
 * Modes: `idle` (no movement), `combat` (approach or kite), `travel` (smart_move
 * to objective location with retry logic), `flee` (run from hostiles at low HP).
 * Non-tank characters kite when they have aggro; tanks approach directly.
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

  function cancelTravel() {
    try { stop(); } catch (e) { /* best effort */ }
    travelPromise = null;
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

    const dist = distance(character, target);
    const shouldKite = !isPartyTank() && character.targets > 0;

    if (shouldKite) {
      const hostile = findHostileTargetingMe();
      const hostileRange = hostile?.range || 30;
      try {
        strategy.kite(target, character.range, hostileRange);
      } catch (e) {
        ctx.logger.error('movement', `kite error: ${e.message}`);
      }
    } else if (dist > character.range) {
      try {
        strategy.approach(target);
      } catch (e) {
        ctx.logger.error('movement', `approach error: ${e.message}`);
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

    destination = coord;
    ctx.logger.info('movement', `Traveling to ${JSON.stringify(coord)}`);

    travelPromise = strategy.travel(coord);
    travelPromise.then(() => {
      ctx.logger.info('movement', 'Travel complete');
      travelPromise = null;
      destination = null;
      retryCount = 0;
    }).catch((e) => {
      travelPromise = null;
      retryCount++;
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
