# Architectural Decisions

Each decision records what was chosen, why, what was rejected, and what would cause revisiting.

## D1 — System Composition with Shared Context

**Chosen**: Systems are independent modules that receive a shared context object (`ctx`). No registry framework, no kernel. Systems own their lifecycle and scheduling. Communication happens primarily through reading shared world state and secondarily through a lightweight event bus.

**Why**: Matches the most successful prior pattern (independent systems + shared world model). Minimal framework tax — the architecture is a convention, not infrastructure. Strongest iteration story: to work on combat, open the combat system; nothing else knows it exists.

**Rejected**:
- *Service Registry* — runtime god object, string-based lookup, overstructured for this scale
- *Microkernel + Plugins* — event-heavy communication caused instability with server disconnects in prior attempts; plugin-to-plugin indirection clunky for tightly coordinating systems (combat + movement during kiting)
- *ECS* — significant impedance mismatch with Adventure Land's API; the game already manages entities. Overkill for a decision-making automation layer.

**Revisit if**: System count grows beyond ~12 and dependency management becomes ad hoc; or if systems start reaching into each other's internals despite the convention.

## D2 — Cooperative Scheduler

**Chosen**: A dedicated scheduler component manages system registration, timing, and lifecycle. Each system registers at its natural frequency. The scheduler controls start/stop for clean disconnect handling. The scheduler itself is a component behind a contract — it will iterate from simple toward priority-aware and instrumented.

**Why**: Provides the independent-timer approach (each system at its natural frequency) without timer sprawl. One `scheduler.stop()` cleanly shuts everything down on disconnect. Observability for free — the scheduler knows what's running and how long each tick takes.

**Rejected**:
- *Single Tick Loop* — unresponsive to game state; combat needs sub-second reactions while logging runs every few seconds. Spike risk when one system's tick is slow.
- *Independent Timers Per System* — prior implementations confirmed this works but suffers timer sprawl, shutdown complexity, and ordering ambiguity.
- *Hybrid Scheduler + Autonomous Timers* — two scheduling models creates recurring "which model?" questions.

**Revisit if**: The scheduler becomes a bottleneck or overly complex; or if a system genuinely needs timing independence that the scheduler can't accommodate.

## D3 — Strategy Pattern with Factory Functions

**Chosen**: Behavioral variation (class-specific combat, situational movement, merchant workflow phases) is handled through strategy objects — plain objects with known method signatures. Factory functions select strategies at initialization based on class; systems can swap strategies at runtime for situational changes. Strategies receive the full `ctx` object so they can read any shared context needed for their decisions without requiring interface changes as context evolves.

**Why**: No inheritance hierarchy to grow out of control. Strategies are easy to test (plain objects), swap (reassign a variable), and compose. Adding a new class means adding a strategy file, not modifying a base class. Passing full `ctx` to strategies avoids brittle parameter lists that need updating whenever a new context slot is added.

**Rejected**:
- *Class inheritance hierarchies* — prior implementations confirmed these grow unwieldy. Base classes accumulate too much responsibility.
- *Mixins* — fragile composition with `this` binding issues; hard to reason about method resolution.

**Revisit if**: Strategy objects become too numerous or too similar, suggesting a more declarative/data-driven approach would reduce duplication.

## D4 — esbuild Bundling

**Chosen**: Multi-file source development bundled into a single output file via esbuild for Adventure Land CODE deployment.

**Why**: Simplest, fastest bundler. Eliminates `load_code()` file-order pain. Real module structure in source, single file in deployment. Prior art (PBot) proved bundled delivery works.

**Rejected**:
- *load_code() ordering* — brittle, fragile dependency ordering, repeated maintenance failure
- *webpack* — heavier configuration for the same result
- *rollup* — more configurable but unnecessary complexity for this project

**Revisit if**: esbuild can't handle a specific transformation need (unlikely for vanilla JS).

## D5 — localStorage with Upfront Schema

**Chosen**: localStorage serves dual purpose — state persistence for disconnect recovery and cross-character data sharing. Schema defined upfront with explicit key ownership, payload shapes, and freshness semantics.

**Why**: Prior implementations used localStorage heavily but without schema discipline, leading to key collisions, stale data, and ownership ambiguity. Upfront schema prevents these problems. localStorage is also cheaper than CM for non-urgent cross-character data sharing.

**Revisit if**: Data volume exceeds localStorage limits; or if IndexedDB becomes necessary for structured queries.

## D6 — Shared World Model (One Writer, Many Readers)

**Chosen**: One system (WorldModel) polls game state and maintains a filtered, categorized entity model in `ctx.world`. All other systems read from it. No other system writes to `ctx.world`.

**Why**: Prior implementations confirmed that a dedicated entity-tracking component prevents duplicated query logic across systems and provides consistent data. The one-writer rule prevents race conditions and makes data flow debuggable.

**Revisit if**: A system needs real-time entity data faster than the WorldModel's polling cycle; consider event-assisted hooks for specific high-priority updates.

## D7 — Event Bus for Secondary Signals

**Chosen**: `ctx.bus` provides lightweight pub/sub for secondary signals. Systems make decisions by reading shared context (`ctx.world`, `ctx.objective`, `ctx.targeting`), not by reacting to events. Currently, events are used for logging and diagnostics (e.g., `targeting:changed`, `objective:changed`).

**Why**: Prior experience with event-driven control flow hit instability on server disconnects. Making events secondary preserves the approachability of event-driven coordination without the fragility of event-driven control.

**Future use**: The scheduler may need to adjust system execution based on signals (e.g., priority bumps, immediate re-evaluation triggers). This is a valid extension of the bus beyond pure logging — the key constraint is that events remain signals ("something happened") rather than commands ("do this"), and systems never depend solely on events for correctness.

**Revisit if**: Too many systems need synchronous coordination that events handle poorly; or if the bus becomes the de facto control flow despite the convention.
