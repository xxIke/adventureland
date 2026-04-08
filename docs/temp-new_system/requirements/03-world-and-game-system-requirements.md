# World and Game System Requirements

## Map and travel awareness

### R33

- Description: The bot must understand map-local points of interest such as NPCs, doors, transporters, and rally locations.
- Why it matters: World interaction is not only combat.
- Minimum baseline behavior: Maintain a queryable set of relevant locations per map or objective.
- Priority: `must`

### R34

- Description: The bot must support map transitions and travel to functional NPCs.
- Why it matters: Banking, upgrades, compounds, monster hunt turn-ins, and exchanges all depend on it.
- Minimum baseline behavior: Navigate to named interaction points and survive map transitions.
- Priority: `must`

## Monster and pack assessment

### R35

- Description: The bot must assess monster danger and reward using actual game data where available.
- Why it matters: The reference data exposes hp, attack, range, resistances, aggro, and reward signals.
- Minimum baseline behavior: Use at least hp, xp, gold, attack, frequency, and aggro to derive a basic farmability heuristic.
- Priority: `must`

### R36

- Description: The bot should reason about packs or farm zones instead of only individual monsters.
- Why it matters: Practical farming decisions are zone-based.
- Minimum baseline behavior: Associate targets with pack locations or boundaries.
- Priority: `should`

## Hunts, events, and special world interactions

### R37

- Description: The bot should support monster hunt participation.
- Why it matters: Monster hunt is explicitly called out across prior work and token progression.
- Minimum baseline behavior: Travel to the relevant NPC, acquire hunt targets, and decide whether the party can handle them.
- Priority: `should`

### R38

- Description: The bot should support a limited set of valuable server events.
- Why it matters: The game includes joinable daily/nightly events with progression relevance.
- Minimum baseline behavior: Detect events of interest and switch objectives when logic exists and the party can participate.
- Priority: `should`

### R39

- Description: The bot should support relevant item recipes and exchanges when they materially affect progression.
- Why it matters: Crafting and token exchange are real game systems, not optional lore.
- Minimum baseline behavior: Know when an item path requires crafting or token exchange rather than only farming or buying.
- Priority: `later`

## Skills and conditions

### R40

- Description: The bot must account for class skills and monster-imposed conditions when making combat decisions.
- Why it matters: Monster and event mechanics can invalidate simplistic attack loops.
- Minimum baseline behavior: React to at least the class’s own core skills and a basic set of dangerous hostile conditions or immunities.
- Priority: `must`

### R41

- Description: The bot should adapt target and skill logic based on enemy defenses or special traits.
- Why it matters: The reference data includes armor, resistance, evasion, reflection, and special hostile mechanics.
- Minimum baseline behavior: Avoid obviously bad attacks and choose legal or safer actions.
- Priority: `should`
