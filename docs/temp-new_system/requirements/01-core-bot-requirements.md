# Core Bot Requirements

## Bootstrapping and runtime lifecycle

### R1

- Description: The bot must bootstrap reliably from the browser/native client without fragile hidden initialization assumptions.
- Why it matters: Prior attempts suffered from brittle file-order coupling and startup ambiguity.
- Minimum baseline behavior: One clear entry point initializes shared modules, validates dependencies, and starts owned loops in a deterministic order.
- Priority: `must`

### R2

- Description: The bot must support explicit start, soft stop, and hard stop semantics for its internal loops.
- Why it matters: Timer sprawl becomes unmanageable without lifecycle ownership.
- Minimum baseline behavior: Every repeating loop is owned, named, and cancelable.
- Priority: `must`

## Recovery from death, reload, and partial state loss

### R3

- Description: The bot must recover from death and resume operation automatically.
- Why it matters: Long-running unattended behavior is impossible otherwise.
- Minimum baseline behavior: Detect death, respawn, and re-enter a valid operating state.
- Priority: `must`

### R4

- Description: The bot must recover enough state after reload/reset to avoid losing all context.
- Why it matters: Browser-native CODE is reset-prone.
- Minimum baseline behavior: Persist current high-level state, core config, and essential coordination data in a recoverable format.
- Priority: `must`

## State awareness and world model

### R5

- Description: The bot must maintain a structured local view of self, party members, hostile entities, relevant monsters, nearby players, NPC context, and current map context.
- Why it matters: Ad hoc querying leads to duplicated logic and inconsistent decisions.
- Minimum baseline behavior: Build and refresh categorized entity collections from game state on a repeating loop.
- Priority: `must`

### R6

- Description: The bot must preserve a distinction between raw observed game state and derived decision state.
- Why it matters: Mixed raw and interpreted state makes debugging difficult.
- Minimum baseline behavior: Keep tracked entities and decision targets separate.
- Priority: `must`

## Party assembly and coordination

### R7

- Description: The bot must maintain a functioning party across the intended active characters.
- Why it matters: Party-based farming and support are central to the design.
- Minimum baseline behavior: Detect missing party membership and re-invite or request appropriately.
- Priority: `must`

### R8

- Description: The bot must support cross-character communication for directives, status, and shared objectives.
- Why it matters: Hunters and merchant cannot coordinate reliably otherwise.
- Minimum baseline behavior: Use a defined message protocol and shared status snapshots for objective, supply, and party-state coordination.
- Priority: `must`

## Movement and travel

### R9

- Description: The bot must have a movement abstraction instead of raw scattered movement calls.
- Why it matters: Travel, rallying, kiting, and resupply require consistent movement behavior.
- Minimum baseline behavior: Encapsulate `smart_move` usage and local repositioning behind a movement module.
- Priority: `must`

### R10

- Description: The bot must support both long-distance travel and local combat repositioning.
- Why it matters: Farming and party travel need different movement behaviors.
- Minimum baseline behavior: Handle travel-to-location and maintain-distance behavior as separate movement modes.
- Priority: `must`

## Combat execution and survival

### R11

- Description: The bot must select and maintain a priority target based on threat, party objective, and opportunity.
- Why it matters: Targeting is the center of combat behavior.
- Minimum baseline behavior: Prioritize hostile threats, objective targets, special monsters, and low-risk cleanup targets in a defined order.
- Priority: `must`

### R12

- Description: The bot must support class-aware attack, heal, and skill usage.
- Why it matters: Shared logic is insufficient for priest, tank, and ranged play.
- Minimum baseline behavior: Provide common combat scaffolding plus class-specific policy hooks.
- Priority: `must`

### R13

- Description: The bot must manage HP/MP recovery deliberately.
- Why it matters: Potion misuse or missed sustain causes avoidable deaths and idle time.
- Minimum baseline behavior: Evaluate potion/regen need on a dedicated loop and prefer legal, available recovery actions.
- Priority: `must`

### R14

- Description: The bot must react defensively to dangerous player hostility.
- Why it matters: Even a PvE bot needs defensive PvP handling.
- Minimum baseline behavior: Detect hostile players or aggression against party members and switch to a defensive target policy.
- Priority: `should`

## Objective selection and control

### R15

- Description: The bot must separate high-level state/objective control from low-level execution.
- Why it matters: Prior implementations mixed intent and action too heavily.
- Minimum baseline behavior: A state/objective component chooses what the bot is doing; movement/combat/inventory components execute that decision.
- Priority: `must`

### R16

- Description: The bot must support at least idle/recover/transition plus role-specific states.
- Why it matters: These states recur across all prior art.
- Minimum baseline behavior: Universal states plus hunter and merchant state catalogs.
- Priority: `must`

## Logging, diagnostics, and operator visibility

### R17

- Description: The bot must emit structured enough logs/status to explain what it is doing and why.
- Why it matters: Silent failures were a repeated problem.
- Minimum baseline behavior: Record state changes, major decisions, errors, and key runtime metrics.
- Priority: `must`

### R18

- Description: The bot must make current objective and key status inspectable from within the browser environment.
- Why it matters: Debugging unattended logic requires visibility.
- Minimum baseline behavior: Expose current state, target, and notable counters through logs, debug UI, or persistent status snapshots.
- Priority: `should`

## Configuration and tuning

### R19

- Description: The bot must support intentional configuration rather than scattering hardcoded names and thresholds.
- Why it matters: Hardcoded assumptions were a recurring maintenance problem.
- Minimum baseline behavior: Centralize roster names, thresholds, toggles, and basic role settings in a shared config structure.
- Priority: `must`

### R20

- Description: The bot must support incremental tuning without redesigning the architecture.
- Why it matters: Fresh implementation is also a learning platform.
- Minimum baseline behavior: Use configurable thresholds and policy hooks for combat, movement, and state timing.
- Priority: `should`
