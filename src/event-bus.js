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
