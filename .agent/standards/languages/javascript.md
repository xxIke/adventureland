# JavaScript Standards — AdventureLand Browser-Native

Standards for JavaScript code running in the Adventure.Land in-game code editor. Extends `core.md`.

## Runtime Environment

Adventure.Land bots run browser-native in the game client. Key constraints:

- **No Node.js APIs** — no `require()`, `fs`, `path`, `process`, etc.
- **No ES module imports** — the code editor uses `load_code()` slots, not modules
- **Browser globals available** — `setTimeout`, `setInterval`, `localStorage`, `JSON`, `Math`, `Date`, etc.
- **Game globals available** — `character`, `parent`, `G` (game data), and game API functions

## Game API Conventions

The game exposes functions and objects on the global scope:

- `character` — the current character's state (hp, mp, position, inventory, etc.)
- `parent` — access to game client internals and API functions
- `G` — static game data (items, monsters, maps, NPCs, skills, conditions)
- `set_message(text)` — display status on character
- `game_log(text)` — write to game log
- `send_cm(name, data)` — send code message to another character
- `on_cm` — handler for incoming code messages
- `smart_move(destination)` — pathfinding movement
- `attack(target)` — basic attack
- `use_skill(name, target)` — use a skill
- `loot()` — loot nearby chests
- `buy(name, quantity)` — buy from NPC
- `sell(slot, quantity)` — sell item

This list is not exhaustive. Refer to adventure.land/docs for the full API.

## Code Organization

- Code is loaded via numbered `load_code()` slots in the game editor
- Build tooling `SHOULD` bundle source into a single output targeting these slots
- Until build tooling is established, keep code compatible with direct paste into the editor
- Use IIFEs or similar patterns to avoid polluting the global namespace beyond intentional exports

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
- `MUST NOT` use empty catch blocks — at minimum log the error via `game_log()`

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
