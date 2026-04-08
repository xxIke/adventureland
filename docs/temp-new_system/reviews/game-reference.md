# Game Reference Review

## Scope reviewed

- `IkeBot/reference/adventureland_mongodb/README.md`
- `IkeBot/reference/adventureland_mongodb/design/items.js`
- `IkeBot/reference/adventureland_mongodb/design/monsters.js`
- `IkeBot/reference/adventureland_mongodb/design/skills.js`
- `IkeBot/reference/adventureland_mongodb/design/maps.js`
- `IkeBot/reference/adventureland_mongodb/design/events.js`
- `IkeBot/reference/adventureland_mongodb/design/upgrades.js`
- `IkeBot/reference/adventureland_mongodb/design/recipes.js`
- `IkeBot/reference/adventureland_mongodb/design/tokens.js`
- supporting readme/config references as needed

## Architectural shape

- The reference confirms Adventure Land exposes a large data-driven world:
  - items with upgrade/compound metadata
  - recipes and token exchanges
  - monsters with hp/xp/gold/attack/range/aggro/resistance traits
  - maps with NPCs, doors, spawn points, events, and instance flags
  - skills for both players and monsters
- This means a browser-native bot can and should reason from game data rather than only hardcoded heuristics.

## Implemented capabilities relevant to bot design

- Item system supports:
  - upgrades with tiered success rates
  - compounds with separate success tables
  - recipe-based crafting
  - token-based exchanges
  - set pieces and stat-bearing gear
- Monster data exposes:
  - progression-relevant xp and gold
  - attack, frequency, and range
  - aggro and rage tendencies
  - resistances, armor, and special traits
  - achievement progress incentives
- Skill data confirms:
  - class skills are not the only concern; monsters and events impose special mechanics and conditions
  - merchants also have actionable skills
- Map data exposes:
  - NPC interaction points
  - transporter and exchange locations
  - doors and map transitions
  - event maps and joinable content
  - instanced and non-instanced zones
- Event data confirms:
  - there are daily, nightly, and seasonal events
  - some events are explicitly joinable

## Intended but incomplete capabilities from a bot perspective

- The reference itself is not a bot implementation, so all automation still has to be solved.
- The data does not directly provide a progression policy, only the raw facts a bot can use.
- Long-term analytics, optimal gear scoring, and route optimization remain bot responsibilities.

## Strong ideas worth carrying forward

- Build a world-aware bot around actual game data rather than hand-maintained lists where possible.
- Treat upgrades, compounds, recipes, token exchanges, hunts, and events as first-class progression systems.
- Use map/NPC/door metadata to formalize world interactions instead of relying on manual memory.
- Use monster stats to derive farmability and danger heuristics.

## Weaknesses / risks / failure patterns

- Raw data availability can tempt overengineering; the fresh bot should use the subset needed for decisions.
- Full optimal planning from game data alone is expensive for a browser-native bot.
- Seasonal/event content can create breadth creep if treated as required too early.

## Implications for a fresh browser-native implementation

- Requirements should explicitly include support for:
  - upgrade and compound planning
  - craft and exchange awareness where relevant
  - NPC and map travel awareness
  - hunt and event participation decisions
  - monster capability assessment from stats
- The bot should maintain a local, queryable game-knowledge layer derived from `G` and related reference structures.
- Browser-native constraints mean this knowledge layer should stay lightweight and decision-oriented, not a full external analytics system.
