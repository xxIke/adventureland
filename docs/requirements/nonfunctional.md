# Nonfunctional Requirements

## Maintainability

### R42 — Explicit Subsystem Responsibilities

- **Description**: Each subsystem must have explicit, documented responsibilities with separate modules.
- **Why**: Prior bots drifted toward large base classes with mixed concerns. Boundaries eroded over time.
- **Baseline**: Separate modules for distinct concerns (world model, state control, movement, combat, merchant, logging). Each module's responsibility is documented and bounded.
- **Priority**: `must`

### R43 — No Hidden File-Order Dependencies

- **Description**: The bot must not rely on implicit file-loading order for initialization correctness.
- **Why**: Brittle numbered-file loading (`load_code()` ordering) was a repeated maintenance failure across prior implementations.
- **Baseline**: Either a generated single bundle or a controlled loader that makes dependencies explicit. No implicit ordering assumptions.
- **Priority**: `must`

## Observability

### R44 — No Silent Failure Swallowing

- **Description**: The bot must not silently swallow meaningful errors. Caught errors must be logged with subsystem and operation context.
- **Why**: Silent `.catch()` blocks made prior systems difficult to trust and debug. Failures disappeared without trace.
- **Baseline**: Every caught error is logged with: which subsystem, what operation, and relevant state at time of failure.
- **Priority**: `must`

### R45 — Decision Context Recording

- **Description**: The bot should record enough runtime context to reconstruct why it made a given decision.
- **Why**: Complex autonomous behavior is impossible to tune without understanding the reasoning behind actions.
- **Baseline**: Log state changes, target changes, objective changes, and recovery events with sufficient context to explain the decision.
- **Priority**: `should`

## Recoverability

### R46 — Shared State Schema

- **Description**: Any shared persistent state (localStorage) must have defined key ownership, payload shape, and freshness semantics.
- **Why**: Unschematized localStorage becomes corrupting shared memory. Prior implementations suffered from key collisions, stale data, and ambiguous ownership.
- **Baseline**: Documented keys with explicit owner (which system writes), payload shape, and freshness rules (how often refreshed, when stale).
- **Priority**: `must`

### R47 — Bounded Loop Ownership

- **Description**: Every repeating loop must have one owner, one name, and one reschedule path.
- **Why**: Timer duplication and orphan loops are a major stability risk in browser-native bots. Prior implementations suffered from timer sprawl.
- **Baseline**: Each loop is registered with a single owner. No loop is created without a name and a clear reschedule or cancellation path.
- **Priority**: `must`

## Configurability

### R48 — Centralized Thresholds and Toggles

- **Description**: Thresholds, roster settings, and strategy toggles must live in a shared configuration structure.
- **Why**: Hardcoding behavior parameters in logic code was painful to maintain across all prior implementations.
- **Baseline**: One configuration structure that all systems read. Changes to thresholds or toggles require editing config, not behavior code.
- **Priority**: `must`

## Testability

### R49 — Testable Core Logic

- **Description**: Core decision logic (scoring, target selection, policy evaluation) should be testable outside of live gameplay.
- **Why**: The project is also a software engineering learning tool. Being able to test logic in isolation improves both learning and reliability.
- **Baseline**: Pure functions for scoring, selection, and policy decisions that take data in and return results — separable from game API calls.
- **Priority**: `should`

## Browser Constraints

### R50 — Browser-Native Design

- **Description**: The bot must be designed around browser constraints — no host filesystem, no external process control, limited persistence.
- **Why**: Browser-native CODE is the chosen target environment. Designing for capabilities that don't exist creates unsatisfiable dependencies.
- **Baseline**: All functionality uses in-game APIs, browser-local persistence, and compile-time delivery. No assumptions about host machine access.
- **Priority**: `must`
