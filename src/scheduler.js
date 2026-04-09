/**
 * Scheduler — tick-based system loop that drives all bot subsystems.
 *
 * Each registered system gets its own independent setTimeout chain. Systems can
 * return `{ delay: N }` from their tick function to adaptively adjust their next
 * interval (e.g. faster polling during combat, slower when idle). Tick errors are
 * caught and emitted on the bus as `system:error` events without stopping the loop.
 */

/** Floor for tick intervals — prevents runaway tight loops. */
const MIN_DELAY = 50;

/**
 * Creates a scheduler that manages independent tick loops for named subsystems.
 *
 * @param {object} bus - Event bus for emitting `system:error` events on tick failures
 * @returns {{ register: Function, start: Function, stop: Function, pause: Function, resume: Function, getStats: Function }}
 */
export function createScheduler(bus) {
  const systems = new Map();
  let running = false;

  function scheduleTick(name) {
    const sys = systems.get(name);
    if (!sys || sys.paused) return;

    sys.timerId = setTimeout(() => {
      const start = Date.now();
      try {
        const result = sys.tickFn();
        const elapsed = Date.now() - start;

        sys.stats.lastTickTime = elapsed;
        sys.stats.lastTickAt = start;
        sys.stats.totalTicks++;

        let nextDelay = sys.interval;
        if (sys.adaptive && result && typeof result.delay === 'number') {
          nextDelay = result.delay;
        }
        sys.stats.interval = Math.max(nextDelay, MIN_DELAY);
        scheduleTick(name);
      } catch (err) {
        console.error(`[Scheduler] Error in "${name}" tick:`, err);
        if (bus) {
          bus.emit('system:error', { system: name, operation: 'tick', error: err });
        }
        sys.stats.interval = sys.interval;
        scheduleTick(name);
      }
    }, sys.stats.interval);
  }

  function register(name, tickFn, options = {}) {
    if (systems.has(name)) {
      throw new Error(`[Scheduler] System "${name}" is already registered`);
    }

    const interval = options.interval || 1000;
    const sys = {
      tickFn,
      interval,
      priority: options.priority || 'normal',
      adaptive: options.adaptive !== false,
      paused: false,
      timerId: null,
      stats: {
        lastTickTime: 0,
        lastTickAt: 0,
        totalTicks: 0,
        interval: interval,
        paused: false,
      },
    };

    systems.set(name, sys);

    if (running) {
      scheduleTick(name);
    }
  }

  function start() {
    if (running) {
      console.warn('[Scheduler] Already running');
      return;
    }
    running = true;
    for (const name of systems.keys()) {
      scheduleTick(name);
    }
  }

  function stop() {
    running = false;
    for (const sys of systems.values()) {
      if (sys.timerId !== null) {
        clearTimeout(sys.timerId);
        sys.timerId = null;
      }
    }
    if (bus) bus.clear();
  }

  function pause(name) {
    const sys = systems.get(name);
    if (!sys || sys.paused) return;
    sys.paused = true;
    sys.stats.paused = true;
    if (sys.timerId !== null) {
      clearTimeout(sys.timerId);
      sys.timerId = null;
    }
  }

  function resume(name) {
    const sys = systems.get(name);
    if (!sys || !sys.paused) return;
    sys.paused = false;
    sys.stats.paused = false;
    if (running) {
      scheduleTick(name);
    }
  }

  function getStats() {
    const result = {};
    for (const [name, sys] of systems) {
      result[name] = { ...sys.stats };
    }
    return result;
  }

  return { register, start, stop, pause, resume, getStats };
}
