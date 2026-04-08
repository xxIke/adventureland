# Phase 0: Skeleton

Establish the build pipeline, shared context, scheduler, event bus, and stub systems. Prove the architecture works end-to-end and code deploys to Adventure Land.

## Scope

### Build Pipeline
- esbuild configuration: `src/boot.js` as entry point, bundled to `dist/bot.js`
- Build script (npm or shell) that produces the single output file
- Output is paste-able or uploadable to Adventure Land CODE

### Shared Context
- `ctx` object created in `boot.js` with `world`, `bus`, `config`, `scheduler` slots
- Configuration structure with roster and placeholder thresholds

### Scheduler
- System registration (name, tick function, interval)
- `start()` and `stop()` lifecycle
- Adaptive timing — tick functions return next desired delay
- All timers tracked and cancelable via `stop()`

### Event Bus
- `on(event, handler)`, `emit(event, payload)`, `off(event, handler)`
- `clear()` for shutdown cleanup

### Stub Systems
- One stub per planned system (WorldModel, Objective, Combat, Movement, Party, Merchant, Potion/Regen, Logging)
- Each stub logs "I would do X" to prove it's registered and ticking

## Prerequisites

- Contracts authored: `contracts/scheduler.md`, `contracts/event-bus.md`
- esbuild available (npm install)

## Acceptance Criteria

1. `npm run build` produces `dist/bot.js` from `src/` source
2. Pasting `dist/bot.js` into Adventure Land CODE starts the bot
3. Scheduler starts all stub systems at their registered intervals
4. `scheduler.stop()` cleanly cancels all timers
5. Console shows stub system tick logs proving all systems are registered
6. Event bus emits and receives a test event

## Requirements Addressed

R1 (reliable bootstrap), R2 (explicit loop lifecycle), R43 (no file-order dependencies), R47 (bounded loop ownership), R50 (browser-native design)
