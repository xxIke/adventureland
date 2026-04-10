---
system: Scheduler
writes:
  ctx.scheduler:
    - register: function
    - start: function
    - stop: function
    - pause: function
    - resume: function
    - getStats: function
reads: nothing
game_globals: []
external: []
---

# Scheduler Contract

## Identity

The cooperative scheduler manages system registration, timing, and lifecycle. It is infrastructure — not a domain system. It lives on `ctx.scheduler` and is the sole owner of all repeating timers in the bot.

## Dependencies

None at creation. Optionally receives an event bus reference for error reporting via `system:error` events.

## Public Interface

### `createScheduler(bus?)`

Creates and returns a scheduler instance. If `bus` is provided, tick errors are emitted as `system:error` events.

**Parameters:**
- `bus` (EventBus, optional) — event bus for error reporting

**Returns:** Scheduler object

### `scheduler.register(name, tickFn, options?)`

Register a system with the scheduler.

**Parameters:**
- `name` (string) — unique system name
- `tickFn` (function) — called on each tick. May return `{ delay }` to override next interval.
- `options` (object, optional):
  - `interval` (number, default: 1000) — milliseconds between ticks
  - `priority` (string, default: 'normal') — `'high'` | `'normal'` | `'low'`
  - `adaptive` (boolean, default: true) — whether to honor `{ delay }` return values

**Returns:** void

**Preconditions:**
- `name` must be unique. Re-registering the same name throws an error.

**Postconditions:**
- System is registered. If scheduler is already running, system starts immediately.

### `scheduler.start()`

Start all registered systems.

**Postconditions:**
- Each registered system gets exactly one `setTimeout` timer.
- If already running, logs a warning and returns (no-op). Does not create duplicate timers.

### `scheduler.stop()`

Stop all systems and cancel all timers.

**Postconditions:**
- All timers are cancelled. No tick functions will fire after `stop()` returns.
- If `bus` was provided, `bus.clear()` is called.
- Idempotent — safe to call multiple times.

### `scheduler.pause(name)`

Pause a single system by name.

**Postconditions:**
- System's timer is cancelled. Other systems continue.
- If system is already paused or doesn't exist, no-op.

### `scheduler.resume(name)`

Resume a paused system.

**Postconditions:**
- System's timer restarts at its registered interval.
- If system is not paused or doesn't exist, no-op.

### `scheduler.getStats()`

Return per-system timing data.

**Returns:** Object mapping system names to stats:
```
{
  [name]: {
    lastTickTime: number,    // ms duration of last tick
    lastTickAt: number,      // timestamp of last tick
    totalTicks: number,      // total ticks since start
    interval: number,        // current interval
    paused: boolean
  }
}
```

## Behavior Contracts

### Tick Execution

1. Each system's tick function is called via `setTimeout`, not `setInterval`. After each tick completes, the next timeout is scheduled.
2. If `adaptive` is enabled and the tick function returns `{ delay: N }`, the next timeout uses `N` ms instead of the default interval. If the tick returns nothing or `adaptive` is false, the default interval is used.
3. The minimum delay is 50ms regardless of returned value.

### Error Handling

1. If a tick function throws, the error is caught.
2. If `bus` is available, a `system:error` event is emitted with `{ system: name, operation: 'tick', error }`.
3. The error is also logged to `console.error`.
4. The system continues on its default interval — errors do not kill the system.

### Timer Ownership

1. Each registered system has exactly one timer at any time (R47).
2. No timer is created without a name and a clear reschedule path.
3. `stop()` cancels all timers. No orphan timers can survive a stop/start cycle.

## Requirements Traceability

| Requirement | How satisfied |
|-------------|--------------|
| R1 (reliable bootstrap) | Deterministic `start()` creates all timers in registration order |
| R2 (explicit loop lifecycle) | `start()`, `stop()`, `pause()`, `resume()` provide full lifecycle control |
| R47 (bounded loop ownership) | Each system gets exactly one named, cancelable timer |
