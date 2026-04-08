# adventureland/codex Review

## Scope reviewed

- `archive/src/`
- `archive/v2/`
- `src/Bot/`
- `docs/design_notes.md`
- `docs/questions.md`
- `src/Server/server.js`

This branch is clearly a distinct later attempt. It archives earlier `src` and `v2` work, then introduces a newer `src/Bot` tree and notes about possible server-assisted coordination. The active browser-native bot code is still incomplete, but the design intent is clearer.

## Architectural shape

- Archived prior work is preserved under `archive/`.
- New active work under `src/Bot/` defines:
  - numbered modules
  - a `Bot` base class
  - `Hunter` and `Merchant` extensions
  - per-class files
  - logger, movement, and server-coordination placeholders
- The design notes describe a hybrid model where the browser bot does core gameplay work and an external service could optionally provide analytics, pathing, persistence, and long-term memory.

## Implemented capabilities

- Active `src/Bot/` implements:
  - config-driven bot construction
  - logger initialization
  - move-manager instantiation
  - tracked entity model for targets, hostiles, party members, and trade candidates
  - common timeout scheduling for potion/entity/skill/log/state handlers
  - hunter and merchant state catalogs
- The current code largely frameworks the system rather than solving behavior end-to-end.
- `serverCoord.7.js` is effectively a stub.
- `src/Server/server.js` does not currently add meaningful implementation value.

## Intended but incomplete capabilities

- The notes are ambitious about merchant control, dynamic hunter composition, analytics, scouting, external path support, and long-term persistence.
- The active code has not yet caught up to that ambition.
- Potion logic, movement logic, combat execution, state execution, and merchant workflows are mostly placeholders in the new tree.
- The external-service notes are useful historically, but out of scope for the fresh browser-native target.

## Strong ideas worth carrying forward

- Separate archived legacy work from active fresh work rather than refactoring in place.
- Keep a clearly named component map even in a browser-native bot.
- Treat merchant as the operational coordinator for progression, item flow, and party support.
- Centralize entity surveying and target classification.
- Use explicit state objects with handler bindings and default timeouts.
- Capture design questions in docs rather than only in code comments.

## Weaknesses / risks / failure patterns

- The new active code is too skeletal to validate its architecture in practice.
- Several files exist only to confirm load success, which suggests unresolved file-loading friction.
- The external-server concept risks leaking out-of-scope assumptions into the browser-native design.
- The branch still inherits the numbered-file and `load_code()` mental model.
- There is more architecture than working behavior in the active tree.

## Implications for a fresh browser-native implementation

- The best value here is conceptual, not operational.
- Preserve the newer branch’s cleaner subsystem naming and separation of active vs archived work.
- Discard the external-service dependency as a design requirement.
- Treat merchant-coordinated progression, structured state catalogs, and tracked-entity models as valid ideas to retain.
- Avoid spending early effort on server coordination, since this branch shows that speculative infrastructure can outpace actual bot behavior.
