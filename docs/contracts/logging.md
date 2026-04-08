# Logging Contract

## Identity

Centralized logging system providing structured log collection, debug control, status display, and periodic persistence. Logging is a scheduled system registered with the scheduler for periodic localStorage snapshots, but also exposes a logger interface used synchronously by all systems throughout their execution.

**Scheduling**: The snapshot tick runs at low frequency (~5s). The logging interface itself is called synchronously by other systems at any time.

## Dependencies

- `ctx.bus` — subscribes to `system:error` for automatic error capture
- `ctx.world` — reads for status snapshots
- `ctx.scheduler` — reads `getStats()` for runtime metrics in snapshots
- Game globals: `character` (for `set_message`)
- localStorage: `al_bot:logging:snapshot` — periodic snapshot persistence

## Public Interface

### `createLogger(bus?)`

Creates and returns a logger instance. If `bus` is provided, the logger automatically subscribes to `system:error` events and records them.

**Parameters:**
- `bus` (EventBus, optional) — event bus for automatic error capture

**Returns:** Logger object

### `logger.log(system, level, message, data?)`

Record a structured log entry.

**Parameters:**
- `system` (string) — source system name (e.g., `"world-model"`, `"combat"`)
- `level` (string) — one of the defined log levels
- `message` (string) — human-readable log message
- `data` (any, optional) — structured data associated with the entry

**Returns:** void

**Behavior:**
- Entry is added to the in-memory buffer if the level is enabled for the given system
- If buffer exceeds 50 entries, the oldest entry is dropped
- Entry is also written to console (see Console Output below)

### `logger.fatal(system, message, data?)`
### `logger.error(system, message, data?)`
### `logger.warn(system, message, data?)`
### `logger.info(system, message, data?)`
### `logger.debug(system, message, data?)`

Convenience methods. Each calls `logger.log()` with the corresponding level.

### `logger.setLevel(system, level)`

Set the active log level for a specific system.

**Parameters:**
- `system` (string) — system name, or `"*"` for global default
- `level` (string) — minimum level to record for this system

**Returns:** void

**Postconditions:**
- Messages below the set level for that system are discarded (not buffered, not printed)
- System-specific levels override the global default

### `logger.setMessage(text)`

Set the in-game `set_message()` display for simple state/informational visibility.

**Parameters:**
- `text` (string) — message to display on the character

**Returns:** void

**Behavior:**
- Calls `set_message(text)` immediately
- Also records an info-level log entry with system `"status"`

### `logger.getBuffer()`

Return the current in-memory log buffer as an array.

**Returns:** Array of log entries (see Log Entry Shape)

### `logger.tick()`

Snapshot tick function registered with the scheduler. Persists current buffer and status to localStorage.

**Returns:** void

## Log Levels

Levels are ordered from most to least severe. A system's configured level determines the minimum severity that is recorded.

| Level | Value | Purpose |
|-------|-------|---------|
| `fatal` | 0 | Critical failure, needs immediate attention |
| `error` | 1 | Operation failed but system can recover |
| `warn` | 2 | Unexpected condition, worth investigating |
| `info` | 3 | General runtime information, state changes |
| `debug` | 4 | Detailed diagnostic information for development |

Default level: `info` (global). Per-system overrides allow enabling `debug` for specific systems without flooding output from all systems.

## Log Entry Shape

```
{
  system: string,       // source system name
  level: string,        // log level name
  message: string,      // human-readable message
  data: any | null,     // optional structured data
  timestamp: number,    // Date.now() when recorded
}
```

## Behavior Contracts

### Buffer Management

1. The in-memory buffer holds a maximum of **50 entries**.
2. When the buffer is full, the oldest entry is dropped (FIFO).
3. Only entries that pass the level filter are added to the buffer.
4. The buffer is an ordered array, newest entries at the end.

### Level Filtering

1. A global default level applies to all systems unless overridden.
2. `setLevel(system, level)` sets a per-system override.
3. `setLevel("*", level)` changes the global default.
4. When evaluating whether to record: if a system-specific level exists, use it; otherwise use the global default.
5. An entry is recorded if its level value is **<=** the configured level value for its system (lower value = higher severity = always passes).

### Console Output

Every recorded log entry is written to **both**:
1. `console.log` with format: `[{system}] {level}: {message}` (or `console.error` for `fatal`/`error` levels)
2. `game_log` with format: `[{system}] {message}` (for in-game visibility)

`game_log` is only called for `info` level and above (not `debug`) to avoid flooding the game log.

### set_message Integration

1. `setMessage(text)` calls the game's `set_message(text)` to display text on the character.
2. Systems call `logger.setMessage()` to communicate simple status (current state, current target, etc.).
3. The last `setMessage` value persists on-screen until the next call.

### Automatic Error Capture

1. If `bus` is provided, the logger subscribes to `system:error` events.
2. Each `system:error` event is recorded as an `error`-level entry with the event's `system` field as the source.
3. This ensures all scheduler-caught errors appear in the log buffer without systems needing to log errors explicitly.

### Snapshot Persistence

1. The `tick()` function writes a snapshot to localStorage at `al_bot:logging:snapshot`.
2. Snapshot contains: current buffer contents, character name, timestamp.
3. Snapshot payload shape:
   ```
   {
     character: string,
     timestamp: number,
     entries: LogEntry[],
     stats: object,        // scheduler.getStats() if available
   }
   ```
4. Snapshot overwrites the previous value (not append).

### Error Handling

1. If `set_message()` is unavailable, `setMessage()` logs a warning and continues.
2. If localStorage write fails (quota exceeded), the error is logged to console but does not throw.
3. The logger itself never throws — it is the last-resort recording mechanism.

## localStorage Schema

| Key | Owner | Payload | Freshness |
|-----|-------|---------|-----------|
| `al_bot:logging:snapshot` | Logging | `{ character, timestamp, entries, stats }` | Written every ~5s by snapshot tick |

## Requirements Traceability

| Requirement | How Satisfied |
|-------------|---------------|
| R17 (structured logging) | Structured entries with system, level, message, data, timestamp |
| R18 (inspectable status) | `setMessage()` for in-game display; `getBuffer()` for programmatic access; localStorage snapshots for post-mortem |
| R44 (no silent failures) | Automatic `system:error` subscription captures all scheduler-caught errors |
| R45 (decision context) | `data` field on log entries carries structured decision context; `debug` level available per-system |
| R46 (shared state schema) | `al_bot:logging:snapshot` has defined owner, shape, and freshness |
