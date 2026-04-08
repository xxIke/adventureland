# adventureland/main Review

## Scope reviewed

- `README.md`
- `Docs/notes.md`
- `src/`
- `v2/`

This branch contains two distinct in-game CODE implementations: `src/` and `v2/`. Both target the browser/native client model. The branch contents do not prove a clean linear evolution from one to the other, so they should be treated as parallel strata of prior work rather than a simple before/after sequence.

## Architectural shape

- `src/` is a lighter fresh attempt with a base `Bot` plus `Hunter` and `Merchant` subclasses, utility helpers, and mostly stubbed state handlers.
- `v2/` is a broader framework attempt with a larger base class, explicit state objects, handler timeouts, logger and movement classes, merchant and hunter specialization, and better-documented intended behavior.
- Both rely on `load_code()` ordering, global game state, browser-local persistence, and timer-driven loops rather than a single tick orchestrator.

## Implemented capabilities

- Shared base loop concepts are present in both `src/` and `v2/`:
  - entity scanning and categorization
  - potion management
  - state dispatch
  - skill dispatch
  - merchant/hunter role split
- `src/` implements:
  - party maintenance helpers
  - basic entity collection and target categorization
  - attack and kite loops for hunters
  - merchant trade wishlist loop skeleton
- `v2/` implements more of the intended system:
  - richer state catalog covering universal, merchant, and hunter states
  - localStorage backup of state/config/inventory snapshots
  - logger abstraction with debug/info/critical channels
  - movement manager wrapper around `smart_move`
  - merchant inventory management, upgrade, compound, restock, and wander flow with partial concrete logic
  - hunter target prioritization, kite/attack timing, and initial state structure

## Intended but incomplete capabilities

- Fully purposeful state transitions are still incomplete in both implementations.
- `src/` leaves most state handlers as stubs and appears more like a framework reset than a finished bot.
- `v2/` still leaves many class-specific handlers and event logic as placeholders.
- Merchant route optimization, node gathering, robust sales policy, and event handling are still more designed than fully solved.
- Hunter objective selection is not yet a true progression planner; it mostly assumes externally chosen targets or hardcoded starting targets.

## Strong ideas worth carrying forward

- Separate universal bot concerns from hunter and merchant concerns.
- Use explicit handler ownership rather than burying all behavior in one loop.
- Keep a tracked world model for party members, hostile entities, target entities, and trade opportunities.
- Persist enough state to recover from reloads and partial browser resets.
- Give merchant its own long-running economy/support loop instead of treating it as just another combat character.
- Use a movement abstraction rather than scattering `smart_move()` calls everywhere.
- Treat logging/debuggability as a first-class concern, not an afterthought.

## Weaknesses / risks / failure patterns

- `load_code()` slot ordering is a major structural risk.
- Shared state in localStorage has no formal schema, ownership rules, or conflict handling.
- Timer proliferation makes ownership and shutdown behavior hard to reason about.
- `src/` and `v2/` both mix low-level execution and higher-level strategic decisions in the same classes.
- Many handlers catch errors and continue silently, which obscures failures.
- The class hierarchy is broad, but many subclass responsibilities remain thin or stubbed.
- Branch-level ambiguity between `src/` and `v2/` means design intent must not be inferred too confidently.

## Implications for a fresh browser-native implementation

- The fresh implementation should keep the browser-native model but avoid raw `load_code()` dependency webs where possible.
- The strongest reusable pattern here is not the exact class structure, but the decomposition into:
  - world model
  - state/objective control
  - movement
  - combat
  - merchant/economy
  - persistence/logging
- A new design should preserve explicit state and handler boundaries from `v2/`, while avoiding the sprawl and partial duplication seen between `src/` and `v2/`.
- LocalStorage can remain part of the solution, but only with explicit ownership, key naming, and payload formats.
