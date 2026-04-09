/**
 * Objective — high-level goal management that drives what the bot is trying to accomplish.
 *
 * Writes `ctx.objective` each tick with the current goal type (idle, farm, travel, recover),
 * target monster type, and location. Downstream systems (targeting, movement) read the
 * objective to decide where to go and what to fight. Strategy pattern allows different
 * behaviors (hunter farms monsters, merchant would handle commerce).
 */

/**
 * Looks up a monster type's spawn location from the game's static data (`G.maps`).
 * Returns the center of the first matching spawn boundary.
 *
 * @param {string} monsterType - Monster type key (e.g. 'bee', 'crab')
 * @returns {{ coord: { x: number, y: number, map: string } } | null}
 */
function findMonsterLocation(monsterType) {
  if (!G || !G.maps) return null;

  for (const mapName in G.maps) {
    const mapData = G.maps[mapName];
    if (!mapData.monsters) continue;

    for (const pack of mapData.monsters) {
      if (pack.type === monsterType) {
        if (pack.boundary) {
          const [x1, y1, x2, y2] = pack.boundary;
          return {
            coord: {
              x: Math.round((x1 + x2) / 2),
              y: Math.round((y1 + y2) / 2),
              map: mapName,
            },
          };
        }
        if (pack.boundaries && pack.boundaries.length > 0) {
          const [x1, y1, x2, y2] = pack.boundaries[0];
          return {
            coord: {
              x: Math.round((x1 + x2) / 2),
              y: Math.round((y1 + y2) / 2),
              map: mapName,
            },
          };
        }
      }
    }
  }
  return null;
}

/**
 * Creates a hunter strategy that farms a configured monster type.
 *
 * Evaluation priority: recover (dead) > travel (wrong map or far from spawn) > farm (at location).
 * Returns `null` when the current objective is still valid (no change needed).
 *
 * @returns {{ name: string, evaluate: Function, advanceStep: Function }}
 */
export function createHunterStrategy() {
  return {
    name: 'hunter',

    evaluate(ctx, current) {
      if (character.rip) {
        if (current.type !== 'recover') {
          return {
            type: 'recover',
            target: null,
            location: null,
            step: null,
            stepComplete: false,
          };
        }
        return null;
      }

      if (current.type === 'recover' && !character.rip) {
        // No longer dead, re-evaluate
      }

      const farmTarget = ctx.config.farmTarget;
      if (farmTarget) {
        const location = findMonsterLocation(farmTarget);

        if (location && location.coord.map !== character.map) {
          if (current.type !== 'travel' || current.target !== farmTarget) {
            return {
              type: 'travel',
              target: farmTarget,
              location,
              step: null,
              stepComplete: false,
            };
          }
          return null;
        }

        if (location) {
          const dx = location.coord.x - character.real_x;
          const dy = location.coord.y - character.real_y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 200) {
            if (current.type !== 'travel' || current.target !== farmTarget) {
              return {
                type: 'travel',
                target: farmTarget,
                location,
                step: null,
                stepComplete: false,
              };
            }
            return null;
          }
        }

        if (current.type !== 'farm' || current.target !== farmTarget) {
          return {
            type: 'farm',
            target: farmTarget,
            location,
            step: null,
            stepComplete: false,
          };
        }
        return null;
      }

      if (current.type !== 'idle') {
        return {
          type: 'idle',
          target: null,
          location: null,
          step: null,
          stepComplete: false,
        };
      }
      return null;
    },

    advanceStep() {
      return null;
    },
  };
}

/**
 * Creates the objective system that evaluates and updates `ctx.objective` each tick.
 *
 * Handles step advancement (for multi-step objectives) and strategy re-evaluation.
 * Emits `objective:changed` on the bus when the objective type transitions.
 *
 * @param {object} ctx - Shared context; this function initializes `ctx.objective`
 * @param {object} strategy - Objective strategy with `evaluate(ctx, current)` and `advanceStep(ctx, current)`
 * @returns {{ tick: Function, getState: Function }}
 */
export function createObjective(ctx, strategy) {
  ctx.objective = {
    type: 'idle',
    target: null,
    location: null,
    step: null,
    stepComplete: false,
    role: strategy.name,
    lastUpdated: Date.now(),
  };

  function tick() {
    try {
      const current = ctx.objective;

      if (current.stepComplete && strategy.advanceStep) {
        try {
          const nextStep = strategy.advanceStep(ctx, current);
          if (nextStep) {
            Object.assign(ctx.objective, nextStep, { stepComplete: false, lastUpdated: Date.now() });
          }
        } catch (e) {
          ctx.logger.error('objective', `advanceStep error: ${e.message}`);
        }
      }

      let proposed;
      try {
        proposed = strategy.evaluate(ctx, current);
      } catch (e) {
        ctx.logger.error('objective', `evaluate error: ${e.message}`);
        ctx.objective.lastUpdated = Date.now();
        return;
      }

      if (proposed) {
        const from = current.type;
        ctx.objective.type = proposed.type;
        ctx.objective.target = proposed.target;
        ctx.objective.location = proposed.location;
        ctx.objective.step = proposed.step;
        ctx.objective.stepComplete = proposed.stepComplete;
        ctx.objective.role = strategy.name;
        ctx.objective.lastUpdated = Date.now();

        if (from !== proposed.type) {
          ctx.bus.emit('objective:changed', { from, to: proposed.type, target: proposed.target });
          ctx.logger.info('objective', `${from} -> ${proposed.type}${proposed.target ? ` (${proposed.target})` : ''}`);
        }
      } else {
        ctx.objective.lastUpdated = Date.now();
      }
    } catch (e) {
      ctx.logger.error('objective', `tick error: ${e.message}`);
    }
  }

  return {
    tick,
    getState() { return ctx.objective; },
  };
}
