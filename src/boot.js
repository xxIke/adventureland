/**
 * Boot — entry point that wires all bot systems together and starts the scheduler.
 *
 * Constructs the shared context (`ctx`), instantiates each system with appropriate
 * strategies based on character class (merchant vs combat, melee vs ranged vs healer),
 * registers them with the scheduler in phase order, and starts the tick loop.
 *
 * Phase ordering ensures context writers run before readers:
 *   1. world-model (entity survey)
 *   2. objective (goal evaluation)
 *   3. party (assembly and tank election)
 *   4. targeting (target selection)
 *   5. attack, combat-skills, potion-regen, movement (action execution)
 */
import { createEventBus } from './event-bus.js';
import { createScheduler } from './scheduler.js';
import { createConfig } from './configuration.js';
import { createWorldModel } from './world-model.js';
import { createLogger } from './logging.js';
import { createTargeting, createMeleeTargetingStrategy, createRangedTargetingStrategy, createHealTargetingStrategy } from './targeting.js';
import { createAttack } from './attack.js';
import { createCombatSkills, createNoOpSkillStrategy, createPriestSkillStrategy, createPaladinSkillStrategy } from './combat-skills.js';
import { createPotionRegen } from './potion-regen.js';
import { createMovement, createSmartMoveStrategy } from './movement.js';
import { createObjective, createHunterStrategy, createMerchantStrategy } from './objective.js';
import { createParty } from './party.js';

const bus = createEventBus();
const scheduler = createScheduler(bus);
const config = createConfig();
const logger = createLogger(bus);
logger.setStatsProvider(() => scheduler.getStats());

const ctx = {
  world: {},
  objective: { type: 'idle', target: null, location: null, step: null, stepComplete: false, role: null, lastUpdated: 0 },
  targeting: { attackTarget: null, healTarget: null, lastUpdated: 0 },
  party: { tank: null, basic_dps: null, travelSync: { destination: null, slowestSpeed: null, active: false } },
  bus,
  config,
  scheduler,
  logger,
};

const isMerchant = ctx.config.roster?.self?.isMerchant;

const worldModel = createWorldModel(ctx);

const objectiveStrategy = isMerchant
  ? createMerchantStrategy()
  : createHunterStrategy();
const objective = createObjective(ctx, objectiveStrategy);
const party = createParty(ctx);

const targetingStrategies = [];
if (!isMerchant) {
  if (character.heal > 0) {
    targetingStrategies.push(createHealTargetingStrategy());
  }
  if (character.range > 30) {
    targetingStrategies.push(createRangedTargetingStrategy());
  } else {
    targetingStrategies.push(createMeleeTargetingStrategy());
  }
}

const targeting = createTargeting(ctx, targetingStrategies);

const potionRegen = createPotionRegen(ctx);
const movement = createMovement(ctx, createSmartMoveStrategy());

// Phase 1 — context writers
scheduler.register('world-model', worldModel.tick, { interval: 500 });

// Phase 2 — objective writes ctx.objective (must run before targeting)
scheduler.register('objective', objective.tick, { interval: 2000 });

// Phase 3 — party writes ctx.party (must run before movement for tank)
scheduler.register('party', party.tick, { interval: 3000 });

// Phase 4 — targeting writes ctx.targeting
scheduler.register('targeting', targeting.tick, { interval: 250 });

// Phase 5 — readers (no ordering dependency on each other)
if (!isMerchant) {
  const attack = createAttack(ctx);
  let skillStrategy;
  if (character.ctype === 'priest') {
    skillStrategy = createPriestSkillStrategy();
  } else if (character.ctype === 'paladin') {
    skillStrategy = createPaladinSkillStrategy();
  } else {
    skillStrategy = createNoOpSkillStrategy();
  }
  const combatSkills = createCombatSkills(ctx, skillStrategy);
  scheduler.register('attack', attack.tick, { interval: 200 });
  scheduler.register('combat-skills', combatSkills.tick, { interval: 500 });
}

scheduler.register('potion-regen', potionRegen.tick, { interval: 150 });
scheduler.register('movement', movement.tick, { interval: 250 });
scheduler.register('logging', logger.tick, { interval: 5000 });

// Initial synchronous population — ctx writers run first so readers see real data on first tick
worldModel.tick();
objective.tick();
party.tick();
targeting.tick();

scheduler.start();
logger.info('boot', `Started — ${Object.keys(scheduler.getStats()).length} systems registered`);
logger.setMessage('Bot online');

// Expose ctx globally for debugging
window.__bot = ctx;
