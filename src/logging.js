/**
 * Logging — structured, level-filtered logging with console output, in-game display,
 * and localStorage persistence.
 *
 * Supports per-system log level overrides. Fatal/error go to `console.error`;
 * info and above also display via `game_log()` in the game client. The tick
 * function periodically snapshots the buffer to localStorage for cross-tab debugging.
 * Auto-subscribes to `system:error` bus events to capture scheduler tick failures.
 */

/** Numeric severity levels — lower number = higher severity. */
const LEVELS = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

/**
 * Creates a logger with leveled output, ring buffer, and localStorage snapshots.
 *
 * @param {object} bus - Event bus; the logger subscribes to `system:error` for automatic error capture
 * @returns {{ log: Function, fatal: Function, error: Function, warn: Function, info: Function, debug: Function, setLevel: Function, setMessage: Function, getBuffer: Function, tick: Function }}
 */
export function createLogger(bus) {
  const buffer = [];
  const maxBuffer = 50;
  const systemLevels = {};
  let globalLevel = LEVELS.info;
  let statsProvider = null;

  function shouldLog(system, level) {
    const threshold = system in systemLevels ? systemLevels[system] : globalLevel;
    return LEVELS[level] <= threshold;
  }

  function log(system, level, message, data) {
    if (!shouldLog(system, level)) return;

    const entry = {
      system,
      level,
      message,
      data: data !== undefined ? data : null,
      timestamp: Date.now(),
    };

    buffer.push(entry);
    if (buffer.length > maxBuffer) {
      buffer.shift();
    }

    // Console output
    const prefix = `[${system}] ${level}: ${message}`;
    if (level === 'fatal' || level === 'error') {
      console.error(prefix, data !== undefined ? data : '');
    } else {
      console.log(prefix, data !== undefined ? data : '');
    }

    // game_log for info and above (not debug)
    if (LEVELS[level] <= LEVELS.info) {
      try {
        game_log(`[${system}] ${message}`);
      } catch (_) {
        // game_log may not be available in all contexts
      }
    }
  }

  function fatal(system, message, data) { log(system, 'fatal', message, data); }
  function error(system, message, data) { log(system, 'error', message, data); }
  function warn(system, message, data) { log(system, 'warn', message, data); }
  function info(system, message, data) { log(system, 'info', message, data); }
  function debug(system, message, data) { log(system, 'debug', message, data); }

  function setLevel(system, level) {
    if (!(level in LEVELS)) {
      console.warn(`[Logger] Unknown level "${level}"`);
      return;
    }
    if (system === '*') {
      globalLevel = LEVELS[level];
    } else {
      systemLevels[system] = LEVELS[level];
    }
  }

  function setMessage(text) {
    try {
      set_message(text);
    } catch (e) {
      console.warn('[Logger] set_message unavailable:', e);
    }
    log('status', 'info', text);
  }

  function getBuffer() {
    return [...buffer];
  }

  function tick() {
    try {
      const snapshot = {
        character: character.name,
        timestamp: Date.now(),
        entries: [...buffer],
        stats: statsProvider ? statsProvider() : null,
      };
      // scheduler stats are read via ctx at call time
      // caller wires this; tick is registered with scheduler which is on ctx
      localStorage.setItem('al_bot:logging:snapshot', JSON.stringify(snapshot));
    } catch (e) {
      console.error('[Logger] Failed to write snapshot to localStorage:', e);
    }
  }

  // Auto-subscribe to system:error events
  if (bus) {
    bus.on('system:error', (payload) => {
      error(payload.system || 'unknown', `Tick error: ${payload.error?.message || payload.error}`, {
        operation: payload.operation,
        error: String(payload.error),
      });
    });
  }

  function setStatsProvider(fn) {
    statsProvider = fn;
  }

  return { log, fatal, error, warn, info, debug, setLevel, setMessage, getBuffer, tick, setStatsProvider };
}
