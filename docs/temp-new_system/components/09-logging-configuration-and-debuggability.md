# Logging, Configuration, and Debuggability

## Purpose

Make the bot understandable, tunable, and recoverable during iterative development and unattended runtime.

## Responsibilities

- structured logging
- state and status snapshots
- runtime metrics
- centralized configuration
- debug surfaces for current objective and state

## Dependencies

- runtime/shared-state layer
- every other subsystem as log producers

## Explicit non-responsibilities

- business logic ownership for movement/combat/merchant decisions

## Candidate design patterns

### Console plus localStorage logs

- Pros:
  - simple
  - native to the environment
- Cons:
  - noisy
  - weak structure
  - easy to lose context

### Structured in-memory/log-buffer model with persisted snapshots

- Pros:
  - better debugging and retention
  - supports targeted status views
- Cons:
  - more implementation work

### Lightweight append-only status/log channels per character

- Pros:
  - simple ownership model
  - easy cross-character inspection
- Cons:
  - can fragment context if not normalized

## Recommended default pattern

Use structured in-memory logging with periodic persisted snapshots, plus lightweight per-character status channels for shared visibility.

## Notes about known AdventureLand/browser constraints

- Browser-native debugging is painful enough that logging deserves a real subsystem.
- Logs should include:
  - current state
  - objective changes
  - target changes
  - recovery events
  - caught errors
- Configuration should be centralized and stable enough that behavior tuning does not require cross-file edits.
