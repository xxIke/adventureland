/**
 * Objective — high-level goal management that drives what the bot is trying to accomplish.
 *
 * Writes `ctx.objective` each tick with the current goal type (idle, farm, travel, recover),
 * target monster type, and location. Downstream systems (targeting, movement) read the
 * objective to decide where to go and what to fight. Strategy pattern allows different
 * behaviors (hunter farms monsters, merchant handles commerce).
 */

import {
  nearLocation, findSellableItems, buyItem, sellItem,
  depositJunk, retrieveItem, getGoldBaseline, updateGoldBaseline,
  openStand, countItem, catalogInventory,
} from './utils.js';

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
  let lastDeathTime = 0;

  return {
    name: 'hunter',

    evaluate(ctx, current) {
      if (character.rip) {
        if (current.type !== 'recover') {
          lastDeathTime = Date.now();
          return {
            type: 'recover',
            target: null,
            location: null,
            step: null,
            stepComplete: false,
          };
        }
        // Already in recover — attempt respawn after 15s delay
        if (lastDeathTime > 0 && Date.now() - lastDeathTime > 15000) {
          try {
            respawn();
            ctx.logger.info('objective', 'Respawning after 15s death delay');
          } catch (e) {
            ctx.logger.error('objective', `respawn failed: ${e.message}`);
          }
          lastDeathTime = 0;
        }
        return null;
      }

      if (current.type === 'recover' && !character.rip) {
        // No longer dead — reset death timer and re-evaluate
        lastDeathTime = 0;
      }

      const farmTarget = ctx.config.farmTarget;
      if (farmTarget) {
        const location = findMonsterLocation(farmTarget);

        if (location?.coord?.map && location.coord.map !== character.map) {
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

        if (location?.coord) {
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

// ---------------------------------------------------------------------------
//  NPC Location Helpers
// ---------------------------------------------------------------------------

/** Finds bank NPC location from G data. */
function findBankLocation() {
  if (!G?.maps?.main?.npcs) return null;
  for (const npc of G.maps.main.npcs) {
    if (npc.id === 'secondhands' || npc.id === 'items0') continue;
    if (G.npcs[npc.id]?.role === 'banker') {
      return { coord: { x: npc.position?.[0] || 0, y: npc.position?.[1] || 0, map: 'main' } };
    }
  }
  // Fallback: known bank area on main
  return { coord: { x: 0, y: -400, map: 'main' } };
}

/** Finds Ponty NPC location from G data. */
function findPontyLocation() {
  if (!G?.maps?.main?.npcs) return null;
  for (const npc of G.maps.main.npcs) {
    if (npc.id === 'secondhands') {
      return { coord: { x: npc.position?.[0] || 0, y: npc.position?.[1] || 0, map: 'main' } };
    }
  }
  return { coord: { x: -129, y: -68, map: 'main' } };
}

/** Reads a hunter's status snapshot from localStorage. */
function readHunterStatus(name) {
  try {
    const raw = localStorage.getItem(`al_bot:party:${name}:status`);
    if (!raw) return null;
    const snap = JSON.parse(raw);
    if (!snap || Date.now() - snap.lastUpdated > 30000) return null;
    return snap;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
//  Merchant Strategy
// ---------------------------------------------------------------------------

/** Step sequences for each merchant objective type. */
const MERCHANT_STEPS = {
  restock: ['check-needs', 'travel-to-bank', 'withdraw', 'buy-potions', 'travel-to-party', 'deliver', 'collect-junk', 'travel-to-bank', 'deposit', 'check-baseline'],
  sell: ['travel-to-ponty', 'sell-items'],
  'bank-ops': ['travel-to-bank', 'deposit-gold', 'store-items'],
  'trade-fulfill': ['scan-trades', 'buy-items'],
  upgrade: ['select-item', 'acquire-scroll', 'travel-to-npc', 'execute-upgrade'],
  compound: ['select-item', 'acquire-scroll', 'travel-to-npc', 'execute-compound'],
};

/**
 * Creates a merchant strategy that manages commerce, resupply, and coordination.
 *
 * Evaluation priority: recover > trade-fulfill > restock > upgrade/compound > sell > idle.
 * Multi-step workflows use step/stepComplete for progression.
 *
 * @returns {{ name: string, evaluate: Function, advanceStep: Function }}
 */
export function createMerchantStrategy() {
  let lastDeathTime = 0;
  let restockNeeds = null; // cached from check-needs step

  return {
    name: 'merchant',

    evaluate(ctx, current) {
      // 1. Recover (dead)
      if (character.rip) {
        if (current.type !== 'recover') {
          lastDeathTime = Date.now();
          return { type: 'recover', target: null, location: null, step: null, stepComplete: false };
        }
        if (lastDeathTime > 0 && Date.now() - lastDeathTime > 15000) {
          try { respawn(); ctx.logger.info('objective', 'Merchant respawning'); } catch (e) { /* retry next tick */ }
          lastDeathTime = 0;
        }
        return null;
      }
      if (current.type === 'recover' && !character.rip) {
        lastDeathTime = 0;
        // Fall through to re-evaluate
      }

      // If already in a multi-step workflow, check step completion and let it finish
      if (current.step && !current.stepComplete && current.type !== 'idle' && current.type !== 'recover') {
        // Travel steps complete when character arrives at location
        if (current.step.startsWith('travel-to') && current.location?.coord) {
          if (nearLocation(current.location.coord, 50)) {
            ctx.objective.stepComplete = true;
          }
        }
        // Action steps (non-travel) complete immediately — executeMerchantStep runs on advanceStep
        if (!current.step.startsWith('travel-to')) {
          ctx.objective.stepComplete = true;
        }
        return null;
      }

      // 2. Trade-fulfill (opportunistic — nearby own characters with trade slots)
      const traders = ctx.world?.charactersOfferingTrade || [];
      const roster = ctx.config.roster;
      if (traders.length > 0 && roster) {
        for (const t of traders) {
          if (roster.available?.includes(t.name) && t.name !== character.name) {
            if (current.type !== 'trade-fulfill') {
              return {
                type: 'trade-fulfill', target: t.name, location: null,
                step: MERCHANT_STEPS['trade-fulfill'][0], stepComplete: false,
              };
            }
          }
        }
      }

      // 3. Restock (hunter needs resupply)
      if (roster?.active) {
        for (const name of roster.active) {
          if (name === character.name) continue;
          const snap = readHunterStatus(name);
          if (snap?.needsResupply && snap.alive) {
            if (current.type !== 'restock') {
              return {
                type: 'restock', target: name, location: findBankLocation(),
                step: MERCHANT_STEPS.restock[0], stepComplete: false,
              };
            }
            return null;
          }
        }
      }

      // 4. Upgrade/compound (if autoUpgrade enabled and suitable items)
      if (ctx.config.toggles?.autoUpgrade) {
        // Scan inventory for upgradeable items (grade 0 scroll only)
        for (let i = 0; i < character.items.length; i++) {
          const item = character.items[i];
          if (!item || item.level === undefined) continue;
          const gItem = G.items[item.name];
          if (!gItem?.upgrade) continue;
          // Check if grade 0 scroll is sufficient (item_grade returns 0 for low-level items)
          if (typeof item_grade === 'function' && item_grade(item) >= 1) continue;
          if (current.type !== 'upgrade') {
            return {
              type: 'upgrade', target: item.name,
              location: findBankLocation(),
              step: MERCHANT_STEPS.upgrade[0], stepComplete: false,
            };
          }
          return null;
        }
      }

      // 5. Sell (inventory has sellable items beyond threshold)
      const sellable = findSellableItems(ctx.config.restockThresholds ? Object.keys(ctx.config.restockThresholds.potionsPerHunter || {}) : []);
      if (sellable.length > 10) {
        if (current.type !== 'sell') {
          return {
            type: 'sell', target: null, location: findPontyLocation(),
            step: MERCHANT_STEPS.sell[0], stepComplete: false,
          };
        }
        return null;
      }

      // 6. Idle — stand open, monitor
      if (current.type !== 'idle') {
        openStand();
        return { type: 'idle', target: null, location: null, step: null, stepComplete: false };
      }
      return null;
    },

    advanceStep(ctx, current) {
      const steps = MERCHANT_STEPS[current.type];
      if (!steps) return null;

      const currentIdx = steps.indexOf(current.step);
      if (currentIdx < 0) return null;

      // Execute step-specific logic before advancing
      try {
        executeMerchantStep(ctx, current, restockNeeds);
      } catch (e) {
        ctx.logger.error('objective', `step execution error (${current.step}): ${e.message}`);
      }

      const nextIdx = currentIdx + 1;
      if (nextIdx >= steps.length) {
        // Workflow complete — return to idle
        restockNeeds = null;
        return { type: 'idle', target: null, location: null, step: null, stepComplete: false };
      }

      const nextStep = steps[nextIdx];

      // Set location for travel steps
      let location = current.location;
      if (nextStep === 'travel-to-bank') {
        location = findBankLocation();
      } else if (nextStep === 'travel-to-ponty') {
        location = findPontyLocation();
      } else if (nextStep === 'travel-to-party') {
        const snap = readHunterStatus(current.target);
        if (snap) {
          location = { coord: { x: snap.x, y: snap.y, map: snap.map } };
        }
      } else if (nextStep === 'travel-to-npc') {
        location = findBankLocation(); // upgrade NPC near bank area
      }

      return { type: current.type, target: current.target, location, step: nextStep };
    },
  };

  /**
   * Executes step-specific game interactions for the completing step.
   * Called by advanceStep before moving to the next step.
   */
  function executeMerchantStep(ctx, current, needs) {
    const step = current.step;

    switch (step) {
      case 'check-needs': {
        // Calculate potion deficits across all hunters
        const deficits = {};
        const roster = ctx.config.roster;
        const targets = ctx.config.restockThresholds?.potionsPerHunter || {};
        if (roster?.active) {
          for (const name of roster.active) {
            if (name === character.name) continue;
            const snap = readHunterStatus(name);
            if (!snap?.alive) continue;
            for (const potion in targets) {
              const have = snap.potions?.[potion] || 0;
              const need = targets[potion] - have;
              if (need > 0) {
                deficits[potion] = (deficits[potion] || 0) + need;
              }
            }
          }
        }
        restockNeeds = deficits;
        ctx.logger.info('objective', `Restock needs: ${JSON.stringify(deficits)}`);
        break;
      }

      case 'withdraw': {
        // Retrieve needed potions from bank
        if (restockNeeds) {
          for (const potion in restockNeeds) {
            const have = countItem(potion);
            const need = restockNeeds[potion] - have;
            if (need > 0) {
              retrieveItem(potion, need).catch(e =>
                ctx.logger.debug('objective', `withdraw ${potion} failed: ${e.message}`)
              );
            }
          }
        }
        break;
      }

      case 'buy-potions': {
        // Buy remaining deficit from NPC
        if (restockNeeds) {
          for (const potion in restockNeeds) {
            const have = countItem(potion);
            const need = restockNeeds[potion] - have;
            if (need > 0) {
              buyItem(potion, need).catch(e =>
                ctx.logger.debug('objective', `buy ${potion} failed: ${e.message}`)
              );
            }
          }
        }
        break;
      }

      case 'deliver': {
        // Send potions to hunters via trade
        ctx.logger.info('objective', `Delivering supplies to ${current.target}`);
        // Trade API interaction — send items to nearby hunter
        // For MVP: items are available, hunter picks up via trade slots (R55)
        break;
      }

      case 'deposit':
      case 'deposit-gold':
      case 'store-items': {
        const baseline = getGoldBaseline() || character.gold;
        depositJunk(baseline, Object.keys(ctx.config.restockThresholds?.potionsPerHunter || {})).catch(e =>
          ctx.logger.debug('objective', `deposit failed: ${e.message}`)
        );
        // Update item catalogue from bank contents for gear delivery (R56)
        try {
          if (character.bank) {
            const allBankItems = [];
            for (const pack in character.bank) {
              const vault = character.bank[pack];
              if (Array.isArray(vault)) allBankItems.push(...vault.filter(Boolean));
            }
            const catalogue = catalogInventory(allBankItems);
            localStorage.setItem('al_bot:merchant:catalogue', JSON.stringify(catalogue));
            ctx.logger.debug('objective', `Updated item catalogue (${Object.keys(catalogue).length} items)`);
          }
        } catch (e) {
          ctx.logger.debug('objective', `catalogue update failed: ${e.message}`);
        }
        break;
      }

      case 'check-baseline': {
        let baseline = getGoldBaseline();
        if (baseline === null) {
          baseline = character.gold;
          updateGoldBaseline(baseline);
          ctx.logger.info('objective', `Gold baseline initialized: ${baseline}`);
        } else {
          // Grow by ~10% of surplus, cap at 112.5M
          const surplus = character.gold - baseline;
          if (surplus > 0) {
            const growth = Math.floor(surplus * 0.1);
            const newBaseline = Math.min(baseline + growth, 112500000);
            updateGoldBaseline(newBaseline);
            ctx.logger.info('objective', `Gold baseline: ${baseline} -> ${newBaseline}`);
          }
        }
        break;
      }

      case 'sell-items': {
        const slots = findSellableItems(Object.keys(ctx.config.restockThresholds?.potionsPerHunter || {}));
        for (const slot of slots) {
          try { sellItem(slot); } catch (e) { /* continue selling */ }
        }
        ctx.logger.info('objective', `Sold ${slots.length} items`);
        break;
      }

      case 'scan-trades': {
        ctx.logger.info('objective', `Scanning trade slots for ${current.target}`);
        break;
      }

      case 'buy-items': {
        // Buy items from own characters' trade slots at 1g
        const traders = ctx.world?.charactersOfferingTrade || [];
        for (const t of traders) {
          if (t.name === current.target && t.slots) {
            for (const slot in t.slots) {
              if (slot.includes('trade') && t.slots[slot]) {
                try { buy(t.slots[slot].name, 1); } catch (e) { /* best effort */ }
              }
            }
          }
        }
        break;
      }

      case 'execute-upgrade': {
        // Find item and scroll in inventory, call upgrade()
        for (let i = 0; i < character.items.length; i++) {
          const item = character.items[i];
          if (item && item.name === current.target) {
            // Find grade 0 scroll
            for (let j = 0; j < character.items.length; j++) {
              if (character.items[j]?.name === 'scroll0') {
                upgrade(i, j).catch(e =>
                  ctx.logger.debug('objective', `upgrade failed: ${e.message}`)
                );
                return;
              }
            }
            break;
          }
        }
        break;
      }

      case 'execute-compound': {
        // Find 3 matching items and scroll, call compound()
        const slots = [];
        for (let i = 0; i < character.items.length; i++) {
          const item = character.items[i];
          if (item && item.name === current.target && item.level === (current.compoundLevel || 0)) {
            slots.push(i);
            if (slots.length >= 3) break;
          }
        }
        if (slots.length >= 3) {
          for (let j = 0; j < character.items.length; j++) {
            if (character.items[j]?.name === 'cscroll0') {
              compound(slots[0], slots[1], slots[2], j).catch(e =>
                ctx.logger.debug('objective', `compound failed: ${e.message}`)
              );
              return;
            }
          }
        }
        break;
      }
    }
  }
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
const OBJECTIVE_PERSIST_KEY = 'al_bot:objective:state';
const PERSIST_INTERVAL = 300000; // 5 minutes

export function createObjective(ctx, strategy) {
  // Attempt to restore persisted state if recovery is enabled
  let initialObjective = {
    type: 'idle',
    target: null,
    location: null,
    step: null,
    stepComplete: false,
    role: strategy.name,
    lastUpdated: Date.now(),
  };

  if (ctx.config.toggles?.recoveryEnabled) {
    try {
      const raw = localStorage.getItem(OBJECTIVE_PERSIST_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.role === strategy.name && Date.now() - saved.lastUpdated < 600000) {
          initialObjective = saved;
          ctx.logger?.info?.('objective', `Restored persisted state: ${saved.type}`);
        }
      }
    } catch (e) {
      // Fall through to default idle
    }
  }

  ctx.objective = initialObjective;

  let configReloadCounter = 0;
  let lastPersistTime = Date.now();

  function tick() {
    try {
      // Reload config periodically to pick up localStorage changes (farmTarget, etc.)
      if (++configReloadCounter >= 5) {
        configReloadCounter = 0;
        if (ctx.config.reload) ctx.config.reload();
      }

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
      // Periodic state persistence (every 5 minutes)
      if (Date.now() - lastPersistTime >= PERSIST_INTERVAL) {
        lastPersistTime = Date.now();
        try {
          localStorage.setItem(OBJECTIVE_PERSIST_KEY, JSON.stringify(ctx.objective));
        } catch (e) {
          ctx.logger.debug('objective', `state persistence failed: ${e.message}`);
        }
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
