/**
 * Objective — high-level goal management that drives what the bot is trying to accomplish.
 *
 * Writes `ctx.objective` each tick with the current goal type (idle, farm, travel, recover),
 * target monster type, and location. Downstream systems (targeting, movement) read the
 * objective to decide where to go and what to fight. Strategy pattern allows different
 * behaviors (hunter farms monsters, merchant handles commerce).
 */

import {
  nearLocation, classifyForSale, buyItem, sellItem,
  depositJunk, retrieveItem, getGoldBaseline, updateGoldBaseline,
  countItem, catalogInventory, tradeSell,
} from './utils.js';
import { findMonsterLocation, findNPCLocation, resolveLocation } from './location.js';

// findMonsterLocation imported from location.js

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

// NPC location helpers moved to location.js — use findNPCLocation(id) and resolveLocation()

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
  restock: ['check-needs', 'travel-to-bank', 'withdraw', 'buy-potions', 'travel-to-party', 'deliver', 'collect-junk', 'check-baseline', 'travel-to-bank', 'deposit'],
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
  let goldBeforeCollect = 0; // gold snapshot before hunter collection (B3 profit tracking)
  let collectStartTime = 0; // when collect-junk started (timeout guard)
  let inventoryCountAtCollect = 0; // item count at collect start (change detection)

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

      // If already in a multi-step workflow, check step completion via state-verification guards
      if (current.step && !current.stepComplete && current.type !== 'idle' && current.type !== 'recover') {
        if (isStepComplete(ctx, current)) {
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
                type: 'restock', target: name, location: resolveLocation('bank'),
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
              location: resolveLocation('bank'),
              step: MERCHANT_STEPS.upgrade[0], stepComplete: false,
            };
          }
          return null;
        }
      }

      // 5. Sell (inventory has explicitly classified sellable items)
      const sellable = classifyForSale(character.items);
      if (sellable.length > 5) {
        if (current.type !== 'sell') {
          return {
            type: 'sell', target: null, location: findNPCLocation('secondhands'),
            step: MERCHANT_STEPS.sell[0], stepComplete: false,
          };
        }
        return null;
      }

      // 6. Idle — monitor (stand management is movement system's responsibility)
      if (current.type !== 'idle') {
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
        executeMerchantStep(ctx, current);
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
        location = resolveLocation('bank');
      } else if (nextStep === 'travel-to-ponty') {
        location = findNPCLocation('secondhands');
      } else if (nextStep === 'travel-to-party') {
        const snap = readHunterStatus(current.target);
        if (snap) {
          location = { coord: { x: snap.x, y: snap.y, map: snap.map } };
        }
      } else if (nextStep === 'travel-to-npc') {
        location = resolveLocation('bank'); // upgrade NPC near bank area
      }

      return { type: current.type, target: current.target, location, step: nextStep };
    },
  };

  /**
   * State-verification guard for step completion. Checks real game state
   * rather than trusting async promises. Each step defines its own completion condition.
   */
  function isStepComplete(ctx, current) {
    const step = current.step;

    // Travel steps: complete when arrived at location
    if (step.startsWith('travel-to') && current.location?.coord) {
      return nearLocation(current.location.coord, 50);
    }

    switch (step) {
      case 'check-needs':
      case 'check-baseline':
      case 'scan-trades':
        return true; // Synchronous steps complete immediately

      case 'withdraw':
        if (!restockNeeds) return true;
        for (const potion in restockNeeds) {
          if (countItem(potion) < restockNeeds[potion]) return false;
        }
        return true;

      case 'buy-potions':
        if (!restockNeeds) return true;
        for (const potion in restockNeeds) {
          if (countItem(potion) < restockNeeds[potion]) return false;
        }
        return true;

      case 'deliver': {
        // Complete when no more fulfillable buy requests in hunter's trade slots
        const target = current.target;
        for (const id in parent.entities) {
          const e = parent.entities[id];
          if (e?.name === target && e.slots) {
            for (const slot in e.slots) {
              if (slot.includes('trade') && e.slots[slot]?.b && countItem(e.slots[slot].name) > 0) {
                return false; // Still have items to deliver
              }
            }
          }
        }
        return true;
      }

      case 'collect-junk': {
        // Complete when inventory changed (items received) OR timeout (~15s)
        const itemCount = character.items.filter(Boolean).length;
        if (itemCount > inventoryCountAtCollect) return true;
        if (Date.now() - collectStartTime > 15000) return true;
        return false;
      }

      case 'deposit':
      case 'deposit-gold':
      case 'store-items': {
        const baseline = getGoldBaseline() || character.gold;
        return character.gold <= baseline + 100; // Close enough after deposit
      }

      case 'sell-items':
        return classifyForSale(character.items).length === 0;

      case 'buy-items':
        return true; // Trade system handles fulfillment

      case 'execute-upgrade':
      case 'execute-compound':
        return true; // Fire-and-forget; result checked next tick via inventory scan

      case 'select-item':
      case 'acquire-scroll':
        return true; // Synchronous evaluation steps

      default:
        return true;
    }
  }

  /**
   * Executes step-specific game interactions for the completing step.
   * Called by advanceStep before moving to the next step.
   */
  function executeMerchantStep(ctx, current) {
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
        // Fulfill hunter's buy requests via trade_sell (R55)
        ctx.logger.info('objective', `Delivering supplies to ${current.target}`);
        for (const id in parent.entities) {
          const e = parent.entities[id];
          if (e?.name === current.target && e.slots) {
            for (const slotName in e.slots) {
              if (!slotName.includes('trade')) continue;
              const slot = e.slots[slotName];
              if (!slot || !slot.b) continue; // Only buy requests
              if (countItem(slot.name) > 0) {
                tradeSell(e, slotName, slot.q || 1).catch(err =>
                  ctx.logger.debug('objective', `trade_sell to ${current.target} failed: ${err.message}`)
                );
              }
            }
            break;
          }
        }
        // Record gold before hunter sends junk (for profit tracking)
        goldBeforeCollect = character.gold;
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

      case 'collect-junk': {
        // Record state for guard-based completion detection
        collectStartTime = Date.now();
        inventoryCountAtCollect = character.items.filter(Boolean).length;
        ctx.logger.info('objective', `Waiting for hunter sends (gold before: ${goldBeforeCollect})`);
        // Hunters send junk/gold via the Trade system when they detect merchant nearby
        break;
      }

      case 'check-baseline': {
        let baseline = getGoldBaseline();
        if (baseline === null) {
          baseline = character.gold;
          updateGoldBaseline(baseline);
          ctx.logger.info('objective', `Gold baseline initialized: ${baseline}`);
        } else {
          // Grow by 10% of hunting profit (gold received from hunters)
          const huntingProfit = character.gold - goldBeforeCollect;
          if (huntingProfit > 0) {
            const growth = Math.floor(huntingProfit * 0.1);
            const newBaseline = Math.min(baseline + growth, 112500000);
            updateGoldBaseline(newBaseline);
            ctx.logger.info('objective', `Gold baseline: ${baseline} -> ${newBaseline} (profit: ${huntingProfit})`);
          }
        }
        break;
      }

      case 'sell-items': {
        const forSale = classifyForSale(character.items);
        for (const entry of forSale) {
          try { sellItem(entry.slot); } catch (e) { ctx.logger.debug('objective', `sell slot ${entry.slot} failed: ${e.message}`); }
        }
        ctx.logger.info('objective', `Sold ${forSale.length} items`);
        break;
      }

      case 'scan-trades': {
        ctx.logger.info('objective', `Scanning trade slots for ${current.target}`);
        break;
      }

      case 'buy-items': {
        // Trade system (createMerchantTradeStrategy) handles trade_sell fulfillment continuously.
        // This step is a synchronous acknowledge — trade system does the actual work.
        ctx.logger.info('objective', `Trade fulfillment for ${current.target} delegated to trade system`);
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
