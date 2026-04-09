/**
 * Event bus — lightweight publish/subscribe system for decoupled inter-system communication.
 *
 * Used by the scheduler, world model, targeting, and objective systems to signal
 * state changes (e.g. hostile player detected, objective changed) without direct coupling.
 */

/**
 * Creates an event bus instance with subscribe, emit, and clear capabilities.
 *
 * Handlers are wrapped in individual objects so that the same function can be
 * subscribed multiple times and each subscription is independently removable.
 *
 * @returns {{ on: Function, emit: Function, clear: Function }} Event bus API
 */
export function createEventBus() {
  const handlers = new Map();

  function on(event, handler) {
    if (!handlers.has(event)) {
      handlers.set(event, new Set());
    }
    const entry = { fn: handler };
    handlers.get(event).add(entry);

    return function unsubscribe() {
      const set = handlers.get(event);
      if (set) set.delete(entry);
    };
  }

  function emit(event, payload) {
    const set = handlers.get(event);
    if (!set) return;
    for (const entry of set) {
      try {
        entry.fn(payload);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    }
  }

  function clear() {
    handlers.clear();
  }

  return { on, emit, clear };
}
