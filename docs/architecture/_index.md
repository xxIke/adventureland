# Architecture

Confirmed design for the AdventureLand bot system. All decisions here were established through analysis of prior implementations and user interview.

## Constraints

- **Browser-only runtime** — no Node.js, no filesystem, no external processes
- **Bundled delivery** — multi-file source, single-file output via esbuild
- **Game API surface** — `character`, `parent`, `G` globals; `send_cm()` for cross-character messaging; `smart_move()` for travel; skill/attack functions; socket events
- **Multiple characters** — 1 merchant + 3 hunters, each running their own bot instance
- **Server instability** — disconnects, code reloads, and respawns are normal conditions

## Design Goals

1. **Slice-at-a-time development** — work on one system while the rest runs
2. **Contracts between systems** — internals change freely; interfaces are stable
3. **Swappable strategies** — class-specific and situation-dependent behavior via strategy objects
4. **Shared world model** — one system writes, all others read
5. **Composition over inheritance** — no monolithic class hierarchies
6. **Graceful degradation** — a broken or incomplete system shouldn't crash the bot

## System Overview

```
Entry Point (boot.js)
  |
  +-- Build shared context (ctx)
  |     ctx.world      WorldModel instance (sole writer: world system)
  |     ctx.bus        EventBus (lightweight pub/sub for signals)
  |     ctx.config     Configuration (roster, thresholds, toggles)
  |     ctx.scheduler  Scheduler instance
  |
  +-- Create systems (each receives ctx)
  |     WorldModel     polls game state, maintains entity lists
  |     Objective      decides what the bot should be doing
  |     Combat         target selection, attacks, skills, survival
  |     Movement       travel + combat repositioning
  |     Party          coordination via CM + shared state
  |     Merchant       inventory, restock, upgrades, economy
  |     Potion/Regen   HP/MP consumable management
  |     Logging        structured logging, status reporting
  |
  +-- Register systems with scheduler
  |     (each at its natural frequency + priority)
  |
  +-- scheduler.start()
```

## Disconnect Handling

```
Server disconnect detected
  -> scheduler.stop()          all systems cease cleanly
  -> persist critical state    localStorage with explicit schema
  -> on reconnect:
      -> scheduler.start()     systems resume from persisted + fresh game state
```

## Documentation in This Directory

| File | Contents |
|------|----------|
| [decisions.md](decisions.md) | The 7 confirmed architectural decisions with rationale |
| [systems.md](systems.md) | Per-system purpose, responsibilities, reads/writes, scheduling |
| [infrastructure.md](infrastructure.md) | Scheduler, event bus, shared context, config, localStorage, build |
| [data-flow.md](data-flow.md) | Data flow, event catalog, cross-character communication, persistence |
