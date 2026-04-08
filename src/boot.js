import { createEventBus } from './event-bus.js';
import { createScheduler } from './scheduler.js';
import { createConfig } from './configuration.js';
import { createWorldModel } from './world-model.js';
import { createLogger } from './logging.js';

const bus = createEventBus();
const scheduler = createScheduler(bus);
const config = createConfig();
const logger = createLogger(bus);

const ctx = {
  world: {},
  bus,
  config,
  scheduler,
  logger,
};

const worldModel = createWorldModel(ctx);

function stubSystem(name) {
  let first = true;
  return function tick() {
    if (first) {
      logger.info(name, 'registered');
      first = false;
    }
  };
}

// Phase 1 systems
scheduler.register('world-model', worldModel.tick, { interval: 500 });
scheduler.register('logging', logger.tick, { interval: 5000 });

// Phase 2+ stubs
scheduler.register('objective', stubSystem('objective'), { interval: 2000 });
scheduler.register('combat', stubSystem('combat'), { interval: 200 });
scheduler.register('movement', stubSystem('movement'), { interval: 250 });
scheduler.register('party', stubSystem('party'), { interval: 2000 });
scheduler.register('merchant', stubSystem('merchant'), { interval: 2000 });
scheduler.register('potion-regen', stubSystem('potion-regen'), { interval: 150 });

scheduler.start();
logger.info('boot', `Started — ${Object.keys(scheduler.getStats()).length} systems registered`);
logger.setMessage('Bot online');

// Expose ctx globally for debugging and game integration
window.__bot = ctx;
