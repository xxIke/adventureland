# World and Game System Requirements

## Map and Travel

### R33 — Map Points of Interest

- **Description**: The bot must understand and query relevant locations per map — NPCs, doors, transporters, rally points.
- **Why**: World interaction is not only combat. Banking, upgrading, compounding, hunt turn-ins, and exchanges all require navigating to specific locations.
- **Baseline**: A queryable set of relevant locations per map, informed by game data and current objectives.
- **Priority**: `must`

### R34 — Map Transitions and NPC Navigation

- **Description**: The bot must navigate to named interaction points and handle map transitions cleanly.
- **Why**: Banking, upgrades, compounds, hunt turn-ins, and exchanges depend on reaching specific NPCs across maps.
- **Baseline**: Travel to named NPCs/locations, survive map transitions without losing state or getting stuck.
- **Priority**: `must`

## Monster and Pack Assessment

### R35 — Monster Danger and Reward Assessment

- **Description**: The bot must assess monster danger and reward using available game data — HP, attack, range, resistances, aggro behavior, XP, and gold.
- **Why**: Game reference data exposes these attributes. Using them beats hardcoded target lists.
- **Baseline**: A farmability heuristic using monster stats (HP, XP, gold, attack, frequency, aggro, resistances).
- **Priority**: `must`

### R36 — Pack/Zone-Level Reasoning

- **Description**: The bot should reason about packs or farm zones rather than only individual monsters.
- **Why**: Practical farming decisions are zone-based — you pick a spot and farm it, not individual monsters.
- **Baseline**: Associate targets with pack locations and zone boundaries. Select zones, not just monster types.
- **Priority**: `should`

## Hunts, Events, and Interactions

### R37 — Monster Hunt Participation

- **Description**: The bot must support monster hunt workflows — acquiring hunts from NPCs, evaluating party capability, and completing hunts.
- **Why**: Monster hunts are explicitly called out across prior work and are part of the token progression path. Hunts provide monster tokens, a valuable progression currency.
- **Baseline**: Hunters travel to monsterhunt NPC, accept hunts, store hunt state (character.s.monsterhunt) in localStorage. Merchant evaluates viability via DPS/TTK heuristics (assume lvl 20+ monsters). Merchant responds via CM with target update for viable hunts. ~30 min timer per hunt; expiry carries no penalty. Turn in at NPC for monster tokens. If hunt target is beyond party scope with basic attacks, wait for timer to expire and seek new hunt.
- **Priority**: `must`

### R38 — Server Event Response

- **Description**: The bot should detect valuable server events and switch objectives when appropriate.
- **Why**: Adventure Land includes joinable daily/nightly/seasonal events with progression relevance.
- **Baseline**: Detect events of interest, evaluate participation value, switch objectives for worthwhile events.
- **Priority**: `should`

### R39 — Recipe and Exchange Awareness

- **Description**: The bot should know when an item progression path requires crafting or token exchange rather than direct farming.
- **Why**: Crafting and token exchange are real game systems that offer progression paths beyond drops.
- **Baseline**: Awareness of recipe/exchange requirements in objective selection and item acquisition planning.
- **Priority**: `later`

## Skills and Conditions

### R40 — Class Skills and Monster Conditions

- **Description**: The bot must account for its class's core skills and react to dangerous monster-imposed conditions or immunities.
- **Why**: Monster and event mechanics can invalidate simplistic attack loops. Ignoring conditions leads to wasted actions or deaths.
- **Baseline**: Use class-appropriate skills. Detect and react to dangerous conditions, immunities, and special mechanics.
- **Priority**: `must`

### R41 — Enemy Defense Adaptation

- **Description**: The bot should adapt targeting and skill use based on enemy defenses — armor, resistance, evasion, reflection.
- **Why**: Game reference data includes these attributes. Attacking a reflect-immune target or an evasion-heavy target with the wrong skills wastes resources.
- **Baseline**: Awareness of enemy defensive attributes. Avoid obviously bad attacks, prefer effective actions.
- **Priority**: `should`

## Progression Mechanics

### R59 — Tracker and Passive Buffs

- **Description**: Hunters should keep tracker device in inventory for kill credit toward persistent passive buffs.
- **Why**: Passive buff accumulation is a long-term progression mechanic. Tracker must be in inventory during kills to receive credit. Buffs are gated behind tracked kill counts for specific monster types.
- **Baseline**: Tracker in hunter keep-list (part of inventory management per R21). No active bot logic needed for MVP — passive mechanic. End-state: buff farming objective to direct hunters toward specific monsters for targeted buff unlocks.
- **Priority**: `later`
