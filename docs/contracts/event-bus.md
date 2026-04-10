---
system: EventBus
writes:
  ctx.bus:
    - on: function
    - emit: function
    - clear: function
reads: nothing
game_globals: []
external: []
---

# Event Bus Contract

## Identity

Lightweight pub/sub for cross-system coordination signals. The event bus is infrastructure — not a domain system. It lives on `ctx.bus`. Events are secondary to shared state reads — systems make decisions by reading `ctx.world`, not by reacting to events.

## Dependencies

None.

## Public Interface

### `createEventBus()`

Creates and returns an event bus instance.

**Returns:** EventBus object

### `bus.on(event, handler)`

Subscribe to a named event.

**Parameters:**
- `event` (string) — event name, following `{system}:{signal}` convention
- `handler` (function) — called with `(payload)` when the event is emitted

**Returns:** Unsubscribe function. Calling it removes this specific handler.

### `bus.emit(event, payload?)`

Emit a named event to all subscribed handlers.

**Parameters:**
- `event` (string) — event name
- `payload` (any, optional) — data passed to handlers

**Returns:** void

### `bus.clear()`

Remove all handlers for all events.

**Returns:** void

## Behavior Contracts

### Emission

1. `emit()` dispatches synchronously — all handlers run before `emit()` returns.
2. Handler execution order is not guaranteed for a given event.
3. Emitting an event with no subscribers is a silent no-op.

### Error Handling

1. If a handler throws, the error is caught and logged to `console.error`.
2. The error does not prevent remaining handlers for the same event from executing.
3. The error does not propagate to the emitter.

### Subscription

1. `on()` returns a function. Calling that function removes the specific handler.
2. The same handler function can be registered multiple times for the same event — each registration is independent.
3. Unsubscribing a handler that was already removed is a no-op.

### Cleanup

1. `clear()` removes all handlers for all events. Idempotent.
2. After `clear()`, any previously returned unsubscribe functions become no-ops.

## Event Naming Convention

Events follow the pattern `{system}:{signal}`:
- `system` identifies the emitting system
- `signal` describes what happened

## Signal Catalog

Initial signals defined for the bot system. This catalog grows as contracts are authored.

| Event | Payload | Emitter | Purpose |
|-------|---------|---------|---------|
| `objective:changed` | `{ from, to, target }` | Objective | Decision logging |
| `targeting:changed` | `{ previous, current, type, reason }` | Targeting | Decision logging |
| `world:hostile-player-detected` | `{ player }` | WorldModel | Alert logging |
| `world:special-monster-detected` | `{ monster }` | WorldModel | Alert logging |
| `system:error` | `{ system, operation, error }` | Any (via scheduler) | Error reporting |

**Design principle**: Events are for **logging and diagnostics only**. Systems make decisions by reading shared context (`ctx.world`, `ctx.objective`, `ctx.targeting`), not by reacting to events. See [data-flow.md](../architecture/data-flow.md) for the full signal catalog rationale.

## Requirements Traceability

| Requirement | How satisfied |
|-------------|--------------|
| R8 (cross-character communication) | Bus enables cross-system signals for party coordination |
| R44 (no silent failures) | `system:error` events surface errors from any system |
