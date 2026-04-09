# JavaScript Standards — AdventureLand Browser-Native

Standards for JavaScript code in the AdventureLand bot project. Extends `core.md`.

## Runtime Environment

Adventure.Land bots run browser-native in the game client. Key constraints:

- **No Node.js APIs** — no `require()`, `fs`, `path`, `process`, etc.
- **ES module `import`/`export` in source** — esbuild bundles into a single IIFE for the game client
- **Browser globals available** — `setTimeout`, `setInterval`, `localStorage`, `JSON`, `Math`, `Date`, etc.
- **Game globals available** — `character`, `parent`, `G` (game data), and game API functions

## Game API Conventions

See game documentation at `https://adventure.land/docs/` or local notes at `docs/game-api.md` for detailed API semantics, cooldown groups, entity properties, and game data structures.

## Code Organization

- Source files use ES module `import`/`export` syntax
- esbuild bundles `src/boot.js` into `dist/bot.js` as a single IIFE (`npm run build`)
- The bundled output is pasted into a single CODE slot in the game editor
- No runtime module system exists in the game client — bundling is mandatory
- Use factory functions and plain objects — no class hierarchies

## Code Documentation

- `MUST` include JSDoc on all exported functions, factory functions, and strategy interfaces (description, `@param`, `@returns`)
- `MUST` include a file-level doc comment describing the module's purpose and system role
- `SHOULD` include brief doc comments on internal helpers when the purpose isn't self-evident from the name and signature
- `MUST NOT` add documentation that merely restates the code — document intent, constraints, and non-obvious behavior

## Style

- `SHOULD` use `const` and `let`, never `var`
- `SHOULD` use arrow functions for callbacks and anonymous functions
- `SHOULD` use template literals over string concatenation
- `MUST` handle the case where game globals may not be immediately available on load
- `SHOULD` use strict equality (`===` / `!==`)

## Error Handling

- `MUST` handle game disconnection and reconnection gracefully
- `MUST` handle character death and respawn without crashing
- `SHOULD` use `try/catch` around game API calls that may throw
- `MUST NOT` use empty catch blocks — at minimum log the error with context

## State Management

- `SHOULD` use `localStorage` with explicit key prefixes to avoid collisions
- `MUST` validate data read from `localStorage` (it may be stale or corrupted)
- `SHOULD` define clear ownership of localStorage keys per component
- `MUST NOT` rely on in-memory state surviving page reloads — persist critical state

## Performance

- `MUST` avoid tight loops that block the game's render loop
- `SHOULD` use `setTimeout`/`setInterval` with reasonable intervals (250ms+ for game loops)
- `SHOULD` batch operations where the game API supports it
- `MUST NOT` make synchronous blocking calls
