/**
 * Movement — state-machine-driven positioning with modes for combat, travel, flee, and idle.
 *
 * Mode detection runs each tick: flee triggers at low HP with active threats,
 * combat engages when targeting has a target, travel activates when the objective
 * specifies a distant location. The strategy object handles the actual movement
 * API calls (approach, kite, flee, travel) so the mode logic stays independent
 * of movement implementation.
 *
 * All combat movement validates destinations with can_move_to() and iterates
 * angles to find valid alternatives when blocked.
 */

import { openStand, closeStand, isStandOpen } from './utils.js';

/** Default tick delay for combat movement calculations (ms). */
const COMBAT_DELAY = 200;

/** Angle increments for iterating blocked movement directions. */
const COMBAT_ANGLES = [0, Math.PI / 12, -Math.PI / 12, Math.PI / 6, -Math.PI / 6, Math.PI / 4, -Math.PI / 4, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2];

/** Wider angle set for flee (may need to reverse direction entirely). */
const FLEE_ANGLES = [0, Math.PI / 6, -Math.PI / 6, Math.PI / 4, -Math.PI / 4, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2, Math.PI * 2 / 3, -Math.PI * 2 / 3, Math.PI];

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
 * Rotate a 2D direction vector by a given angle.
 * @param {number} dx - x component
 * @param {number} dy - y component
 * @param {number} angle - rotation angle in radians
 * @returns {{ x: number, y: number }}
 */
function rotateVector(dx, dy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

/**
 * Creates a movement strategy using the game's `smart_move` for long-distance
 * travel and direct `move` calls for combat positioning.
 *
 * All combat movement validates with can_move_to() and iterates angles when blocked.
 * Approach uses position prediction via going_x/going_y.
 * Kite scores positions on range maintenance, farm boundary, and party safety.
 * Flee prefers party centroid direction when available.
 *
 * @param {object} ctx - Shared context for party/objective data
 * @returns {{ name: string, travel: Function, approach: Function, kite: Function, flee: Function }}
 */
export function createSmartMoveStrategy(ctx) {
  return {
    name: 'smart-move',

    travel(destination) {
      stop();
      return smart_move(destination);
    },

    approach(target, opts) {
      if (!target) return;
      const rangeBuffer = opts?.rangeBuffer ?? 0.8;

      // Use predicted position when target is moving
      const tx = (target.moving && target.going_x !== undefined) ? target.going_x : (target.real_x ?? target.x);
      const ty = (target.moving && target.going_y !== undefined) ? target.going_y : (target.real_y ?? target.y);
      const dist = distance(character, target);
      if (dist <= character.range * rangeBuffer) return;

      const dx = tx - character.real_x;
      const dy = ty - character.real_y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const moveDist = Math.min(character.speed * (COMBAT_DELAY / 1000), dist - character.range * rangeBuffer);
      const ndx = dx / len;
      const ndy = dy / len;

      // Try direct approach first, then iterate angles if blocked
      for (const angle of COMBAT_ANGLES) {
        const r = rotateVector(ndx, ndy, angle);
        const destX = character.real_x + r.x * moveDist;
        const destY = character.real_y + r.y * moveDist;
        if (can_move_to(destX, destY)) {
          move(destX, destY);
          return;
        }
      }
      // All directions blocked — no movement this tick
    },

    kite(target, attackerEntity, opts) {
      if (!target || !attackerEntity) return;

      const step = character.speed * (COMBAT_DELAY / 1000);
      const rangeBuffer = opts?.rangeBuffer ?? 0.9;

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

      // Compute party centroid for safety scoring
      let partyCx = null;
      let partyCy = null;
      if (opts?.partyPositions?.length > 0) {
        partyCx = 0;
        partyCy = 0;
        for (const p of opts.partyPositions) { partyCx += p.x; partyCy += p.y; }
        partyCx /= opts.partyPositions.length;
        partyCy /= opts.partyPositions.length;
      }

      // Try angles from 0° to ±90° from attacker vector, find best valid move
      let bestX = null;
      let bestY = null;
      let bestScore = -Infinity;

      for (const angle of COMBAT_ANGLES) {
        const r = rotateVector(avx, avy, angle);
        const destX = character.real_x + r.x * step;
        const destY = character.real_y + r.y * step;

        if (!can_move_to(destX, destY)) continue;

        // Score: prefer directions that maintain range with attack/heal target
        const newDx = tx - destX;
        const newDy = ty - destY;
        const newDistToTarget = Math.sqrt(newDx * newDx + newDy * newDy);
        const rangeOk = newDistToTarget <= character.range * rangeBuffer;

        let score = rangeOk ? 1000 : -newDistToTarget;
        score -= Math.abs(angle) * 10; // prefer smaller deviations

        // Farm boundary: penalize leaving boundary
        if (opts?.farmBoundary && rangeOk) {
          const [bx1, by1, bx2, by2] = opts.farmBoundary;
          if (destX < bx1 || destX > bx2 || destY < by1 || destY > by2) {
            score -= 500;
          }
        }

        // Party safety: prefer closer to party centroid
        if (partyCx !== null && rangeOk) {
          const distToParty = Math.sqrt((destX - partyCx) ** 2 + (destY - partyCy) ** 2);
          score += Math.max(0, 200 - distToParty);
        }

        if (score > bestScore) {
          bestScore = score;
          bestX = destX;
          bestY = destY;
        }
      }

      if (bestX !== null) {
        move(bestX, bestY);
      } else if (distToTarget > character.range * rangeBuffer) {
        // Can't kite safely — approach target instead
        this.approach(target, opts);
      }
    },

    flee(hostiles, opts) {
      if (!hostiles || hostiles.length === 0) return;

      // Average hostile position
      let ax = 0;
      let ay = 0;
      for (const h of hostiles) {
        ax += (h.real_x ?? h.x);
        ay += (h.real_y ?? h.y);
      }
      ax /= hostiles.length;
      ay /= hostiles.length;

      // Determine preferred flee direction
      let dx, dy;
      if (opts?.partyPositions?.length > 0) {
        // Flee toward party centroid
        let cx = 0;
        let cy = 0;
        for (const p of opts.partyPositions) { cx += p.x; cy += p.y; }
        cx /= opts.partyPositions.length;
        cy /= opts.partyPositions.length;
        dx = cx - character.real_x;
        dy = cy - character.real_y;
      } else {
        // Flee away from hostiles
        dx = character.real_x - ax;
        dy = character.real_y - ay;
      }

      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      dx /= len;
      dy /= len;
      const step = character.speed * (COMBAT_DELAY / 1000);

      // Try preferred direction, then iterate angles if blocked
      for (const angle of FLEE_ANGLES) {
        const r = rotateVector(dx, dy, angle);
        const destX = character.real_x + r.x * step;
        const destY = character.real_y + r.y * step;
        if (can_move_to(destX, destY)) {
          move(destX, destY);
          return;
        }
      }
      // Completely cornered — no valid direction found this tick
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
  let fleeCornerCount = 0;
  let townTeleported = false;
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

  /**
   * Build opts object for strategy methods with party positions and farm boundary.
   */
  function buildOpts() {
    const partyPositions = (ctx.world?.partyMembers || [])
      .filter(m => m.name !== character.name)
      .map(m => ({ x: m.real_x ?? m.x, y: m.real_y ?? m.y }));

    const boundary = ctx.objective?.location?.boundary || null;

    return { farmBoundary: boundary, partyPositions };
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
      fleeCornerCount = 0;
      ctx.logger.info('movement', 'Flee ended — HP recovered');
      return null;
    }

    ensureStandClosed();

    const hostiles = [
      ...(ctx.world.hostileMonsters || []),
      ...(ctx.world.hostilePlayers || []),
    ];
    const opts = buildOpts();

    // Track pre-move position to detect if flee produced movement
    const preX = character.real_x;
    const preY = character.real_y;

    try {
      strategy.flee(hostiles, opts);
    } catch (e) {
      ctx.logger.error('movement', `flee error: ${e.message}`);
    }

    // If character didn't move (cornered), increment counter
    if (character.real_x === preX && character.real_y === preY) {
      fleeCornerCount++;
      if (fleeCornerCount >= 5) {
        try {
          use('town');
          ctx.logger.warn('movement', 'Emergency town teleport — cornered while fleeing');
        } catch (e) {
          ctx.logger.error('movement', `Town teleport failed: ${e.message}`);
        }
        fleeCornerCount = 0;
      }
    } else {
      fleeCornerCount = 0;
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
          strategy.kite(target, attacker, { ...buildOpts(), rangeBuffer: 0.9 });
        } catch (e) {
          ctx.logger.error('movement', `kite error: ${e.message}`);
        }
      } else {
        // Being targeted but can't find attacker — approach target
        const dist = distance(character, target);
        if (dist > character.range * 0.8) {
          try { strategy.approach(target, { ...buildOpts(), rangeBuffer: 0.8 }); } catch (e) { ctx.logger.debug('movement', `approach fallback failed: ${e.message}`); }
        }
      }
    } else {
      const dist = distance(character, target);
      if (dist > character.range * 0.8) {
        try {
          strategy.approach(target, { ...buildOpts(), rangeBuffer: 0.8 });
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
      townTeleported = false;
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
        if (!townTeleported) {
          try {
            use('town');
            ctx.logger.warn('movement', 'Town teleport after 3 travel failures');
            townTeleported = true;
            retryCount = 0;
            retryTimer = Date.now() + 3000;
          } catch (e2) {
            ctx.logger.error('movement', `Town teleport failed: ${e2.message}`);
            destination = null;
            retryCount = 0;
            townTeleported = false;
          }
        } else {
          ctx.logger.error('movement', `Travel failed after retries + town teleport: ${e?.message || e}`);
          destination = null;
          retryCount = 0;
          townTeleported = false;
        }
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
        if (mode === 'flee' && newMode !== 'flee') {
          fleeCornerCount = 0;
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
    fleeCornerCount = 0;
    townTeleported = false;
  }

  return {
    tick,
    stop: stopMovement,
    getState() {
      return { mode, destination, strategyName: strategy.name };
    },
  };
}
