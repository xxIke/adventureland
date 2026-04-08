# Core Bot Requirements

## Bootstrapping and Lifecycle

### R1 — Reliable Bootstrap

- **Description**: The bot must bootstrap reliably without fragile hidden initialization assumptions.
- **Why**: Prior implementations suffered from brittle file-order coupling and startup ambiguity.
- **Baseline**: One clear entry point that initializes shared modules, validates dependencies, and starts owned loops in a deterministic order.
- **Priority**: `must`

### R2 — Explicit Loop Lifecycle

- **Description**: The bot must support explicit start, soft stop, and hard stop semantics for its internal loops.
- **Why**: Timer sprawl becomes unmanageable without lifecycle ownership.
- **Baseline**: Every repeating loop is owned, named, and cancelable. Start/stop operations are deterministic.
- **Priority**: `must`

## Recovery

### R3 — Death Recovery

- **Description**: The bot must recover from death and resume operation automatically.
- **Why**: Long-running unattended behavior is impossible otherwise.
- **Baseline**: Detect death, respawn, and re-enter a valid operating state without manual intervention.
- **Priority**: `must`

### R4 — State Recovery After Reload

- **Description**: The bot must recover enough state after browser reload or code reset to avoid losing all context.
- **Why**: The browser-native CODE environment is reset-prone; losing all state on reload makes the bot fragile.
- **Baseline**: Persist and recover high-level state, core configuration, and coordination data across reloads.
- **Priority**: `must`

## State Awareness

### R5 — Structured World View

- **Description**: The bot must maintain a structured local view of game entities — self, party members, hostile monsters, nearby players, NPCs, and map context.
- **Why**: Ad hoc querying of raw game state leads to duplicated logic and inconsistent decisions across subsystems.
- **Baseline**: Build and refresh categorized entity collections on a repeating cycle. Consumers read structured data, not raw game globals.
- **Priority**: `must`

### R6 — Raw vs. Derived State Separation

- **Description**: The bot must preserve a clear separation between observed game state and decision state.
- **Why**: Mixing raw observations with interpreted/derived state makes debugging difficult and creates hidden dependencies.
- **Baseline**: Keep tracked entities (observed) and decision targets (derived) as separate data. Changes to derivation logic don't corrupt observations.
- **Priority**: `must`

## Party Coordination

### R7 — Party Maintenance

- **Description**: The bot must maintain a functioning party across active characters.
- **Why**: Party-based farming and merchant support are central to the bot's purpose.
- **Baseline**: Detect missing party members, re-invite or request invites as appropriate, handle party join/leave events.
- **Priority**: `must`

### R8 — Cross-Character Communication

- **Description**: The bot must support cross-character communication for directives, status, and shared objectives.
- **Why**: Hunters and merchant cannot coordinate farming, supply, or repositioning without a communication channel.
- **Baseline**: Defined message protocol for commands and responses. Shared status snapshots for objective, supply state, and party health.
- **Priority**: `must`

## Movement

### R9 — Movement Abstraction

- **Description**: The bot must encapsulate movement behind a consistent interface rather than scattering raw movement calls.
- **Why**: Travel, rallying, kiting, and resupply all require movement but with different behavior. Raw calls throughout the codebase create inconsistency.
- **Baseline**: A movement interface that handles both travel and repositioning, abstracting the underlying game API.
- **Priority**: `must`

### R10 — Travel vs. Combat Repositioning

- **Description**: The bot must support both long-distance travel and local combat repositioning as distinct movement modes.
- **Why**: Farming requires travel to zones; combat requires maintaining distance, kiting, or holding position. These are different problems.
- **Baseline**: Travel-to-location and maintain-distance as separately invocable movement behaviors.
- **Priority**: `must`

## Combat

### R11 — Priority Targeting

- **Description**: The bot must select and maintain a priority target based on threat, party objective, and opportunity.
- **Why**: Targeting is the center of combat behavior; unfocused targeting wastes damage and creates danger.
- **Baseline**: Prioritize hostiles threatening the party, then objective targets, then special monsters, then cleanup targets — in a defined order.
- **Priority**: `must`

### R12 — Class-Aware Combat

- **Description**: The bot must support class-specific combat behavior — priest healing, tank positioning, ranged kiting.
- **Why**: A single combat policy cannot serve all classes effectively. Prior implementations confirmed this.
- **Baseline**: Common combat scaffolding with class-specific policy hooks for targeting, skill use, and positioning.
- **Priority**: `must`

### R13 — HP/MP Recovery Management

- **Description**: The bot must manage potion and regen use on a dedicated cycle.
- **Why**: Missed sustain causes avoidable deaths; potion misuse wastes resources and creates idle time.
- **Baseline**: Dedicated evaluation of HP/MP state with appropriate potion/regen use. Prefer available and legal recovery options.
- **Priority**: `must`

### R14 — Hostile Player Response

- **Description**: The bot must detect hostile players and switch to a defensive posture.
- **Why**: Even a PvE-focused bot needs basic PvP survival to avoid losing progress.
- **Baseline**: Detect hostile player aggression and switch targeting/positioning to defensive behavior.
- **Priority**: `should`

## Objective Control

### R15 — Separated Intent and Execution

- **Description**: High-level state/objective control must be separated from low-level execution.
- **Why**: Prior implementations mixed strategic decisions and execution logic, making both harder to debug and iterate on.
- **Baseline**: An objective/state component chooses what to do; movement, combat, and inventory systems execute.
- **Priority**: `must`

### R16 — Universal and Role-Specific States

- **Description**: The bot must support universal states (idle, recover, transition) plus role-specific state catalogs for hunters and merchant.
- **Why**: All characters share some states; role-specific behavior requires additional states. This pattern recurs in every prior implementation.
- **Baseline**: Universal state set shared across roles, plus hunter and merchant state catalogs.
- **Priority**: `must`

## Logging and Diagnostics

### R17 — Structured Logging

- **Description**: The bot must emit structured logs explaining what it is doing and why.
- **Why**: Silent failures were a repeated problem in prior implementations. Unstructured console output is insufficient for debugging autonomous behavior.
- **Baseline**: Record state changes, targeting decisions, errors, and runtime metrics in a structured format.
- **Priority**: `must`

### R18 — Inspectable Status

- **Description**: The bot must expose its current objective, state, target, and key counters for inspection.
- **Why**: Debugging unattended logic requires visibility into what the bot thinks it is doing.
- **Baseline**: Current state, target, and counters accessible through logs, debug UI, or status snapshots.
- **Priority**: `should`

## Configuration

### R19 — Centralized Configuration

- **Description**: The bot must centralize roster names, thresholds, toggles, and role settings rather than hardcoding them.
- **Why**: Hardcoded assumptions were a recurring maintenance problem across all prior implementations.
- **Baseline**: Shared configuration structure with roster, thresholds, and toggles. One place to update, all systems read from it.
- **Priority**: `must`

### R20 — Tuning Without Redesign

- **Description**: The bot must support incremental tuning of thresholds and policy parameters without requiring structural changes.
- **Why**: The bot is also a learning platform; rapid experimentation matters.
- **Baseline**: Configurable thresholds and policy hooks that can be adjusted without modifying system logic.
- **Priority**: `should`
