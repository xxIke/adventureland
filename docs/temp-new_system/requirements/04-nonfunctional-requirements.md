# Nonfunctional Requirements

## Maintainability

### R42

- Description: The fresh implementation must keep subsystem responsibilities explicit.
- Why it matters: Prior bots drifted toward large base classes and mixed concerns.
- Minimum baseline behavior: World model, state control, movement, combat, merchant, and logging/config are separate modules with clear ownership.
- Priority: `must`

### R43

- Description: The implementation must avoid hidden file-order dependencies as much as the runtime allows.
- Why it matters: Brittle numbered-file loading was a repeated maintenance failure.
- Minimum baseline behavior: Use either a disciplined bundle/build output or a tightly controlled layered loader contract.
- Priority: `must`

## Observability and debuggability

### R44

- Description: The implementation must not silently swallow meaningful failures.
- Why it matters: Silent catches made prior systems difficult to trust.
- Minimum baseline behavior: Log caught errors with enough context to identify the failing subsystem and operation.
- Priority: `must`

### R45

- Description: The implementation should record enough runtime context to reconstruct why a decision was made.
- Why it matters: Complex autonomous behavior is impossible to tune otherwise.
- Minimum baseline behavior: Log state changes, target changes, objective changes, and recovery events.
- Priority: `should`

## Recoverability and safety

### R46

- Description: Shared state must use defined keys and ownership rules.
- Why it matters: LocalStorage without discipline becomes corrupting shared memory.
- Minimum baseline behavior: Define per-key owner, payload shape, and freshness semantics.
- Priority: `must`

### R47

- Description: Repeating loops must be bounded and owned.
- Why it matters: Timer duplication and orphan loops are a major browser-native stability risk.
- Minimum baseline behavior: Every loop has one owner, one name, and one reschedule path.
- Priority: `must`

## Configurability

### R48

- Description: Thresholds, roster names, and strategy toggles must be centralized.
- Why it matters: Hardcoding these in behavior code was painful in prior repos.
- Minimum baseline behavior: Shared config object with stable fields for roster, thresholds, and behavior modes.
- Priority: `must`

## Testability

### R49

- Description: Core decision logic should be testable outside of live gameplay where practical.
- Why it matters: The project is also a software-engineering learning tool.
- Minimum baseline behavior: Keep pure scoring, target selection, and policy helpers separate from direct game API calls.
- Priority: `should`

## Browser-native constraints

### R50

- Description: The architecture must assume no host filesystem, no external process control, and limited persistence.
- Why it matters: Browser-native CODE is the chosen target.
- Minimum baseline behavior: Design around in-game APIs, browser-local persistence, and compile-time or copy/paste delivery.
- Priority: `must`
