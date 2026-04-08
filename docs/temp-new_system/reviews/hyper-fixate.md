# hyper-fixate Review

## Scope reviewed

- `README.md`
- `docs/notes.md`
- `docs/party_comms.md`
- `codes/`

## Architectural shape

- Browser-native in-game CODE bot system built around numbered `load_code()` files.
- Strong inheritance model:
  - `BotBase`
  - `HunterBase`
  - `MerchantBase`
- Heavy use of:
  - timeout and interval handlers
  - localStorage backup and shared state
  - code messages (`send_cm`) for coordination
  - utility files for movement, monsters, characters, and inventory

## Implemented capabilities

- Party assembly and invite handling
- Base potion selection logic
- Repeating attack, state, potion, entity, and coordination loops
- Tracked entity buckets for:
  - party members
  - hostile monsters
  - hostile players
  - target-pack monsters
  - special monsters
  - weak monsters
- Hunter behaviors:
  - party assembly checks
  - target pack discovery
  - target prioritization
  - priest heal targeting
  - attack and kite timing
  - pack rotation and hunt state logic
- Merchant behaviors:
  - inventory management
  - item catalog and equipment catalog backup
  - upgrade preparation
  - restock workflow
  - wishlist collection and fulfillment
  - sales/town loop scaffolding
- Local backup of bot state and party configuration

## Intended but incomplete capabilities

- Several class-specific skill handlers remain TODO.
- Event participation is documented but not really solved.
- Some merchant states exist conceptually without meaningful implementation.
- Movement is still partly a wrapper around game primitives rather than a fully custom navigator.
- Debugging and coordination work, but formal message protocol design remains thin.

## Strong ideas worth carrying forward

- Browser-native multi-character coordination is viable using CM plus localStorage.
- State-machine-based behavior worked well enough to support merchant and hunter specialization.
- Separate entity monitoring from combat execution.
- Use merchant workflows as structured operational loops rather than one-off actions.
- Build pack metadata and farmability heuristics from game data, not only hardcoded targets.
- Treat restocking and wishlists as a first-class cross-character supply mechanism.

## Weaknesses / risks / failure patterns

- Very large base classes accumulate too much responsibility.
- `load_code()` order and hardcoded naming assumptions make maintenance fragile.
- Extensive silent `.catch()` usage hides operational failures.
- Timer and interval sprawl complicates reasoning and shutdown.
- LocalStorage is used heavily but without strong schema discipline.
- The bot mixes strategic planning, coordination, and execution in the same layer.

## Implications for a fresh browser-native implementation

- This is the strongest implementation prior art for practical browser-native automation.
- The fresh design should keep:
  - explicit state control
  - world/entity tracking
  - merchant-driven support
  - CM plus shared-state coordination
- It should not keep:
  - oversized inheritance-heavy base classes
  - implicit localStorage contracts
  - silent failure handling
  - unbounded timer growth
