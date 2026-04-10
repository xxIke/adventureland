---
system: Configuration
writes:
  ctx.config:
    - roster: object
    - thresholds: object
    - toggles: object
    - restockThresholds: object
    - specialMonsters: string[]
    - friendlyPlayers: string[]
    - farmTarget: string | null
reads: nothing
game_globals:
  - get_characters()
external:
  - localStorage
---

# Configuration Contract

## Identity

Centralized configuration providing roster, thresholds, toggles, and farm target to all systems via `ctx.config`. Configuration is infrastructure — not a scheduled domain system. It is created at boot and read by all systems.

## Dependencies

- Game API: `get_characters()` — returns all characters owned by the player
- localStorage: `al_bot:config:activeRoster` — active roster override
- localStorage: `al_bot:config:farmTarget` — farm target override

## Public Interface

### `createConfig()`

Creates and returns a configuration object. This is called once at boot and the result is placed on `ctx.config`.

**Returns:** Config object (shape defined below)

### `config.reload()`

Re-reads dynamic configuration sources (localStorage keys). Called by boot.js on startup only. Configuration is immutable after boot. Dynamic values (farm target, active roster) are read from localStorage directly by the systems that need them — they do not trigger config reload.

**Returns:** void

**Postconditions:**
- `config.farmTarget` reflects `al_bot:config:farmTarget` value at boot time
- `config.roster.active` reflects `al_bot:config:activeRoster` value at boot time
- Static config (thresholds, toggles, special monsters) is unchanged

## Config Shape

```
ctx.config = {
  roster: {
    available: [],          // populated from get_characters() at boot
    active: [],             // character names from localStorage, subset of available
    characters: {},         // map: name -> { name, ctype, online } from get_characters()
    merchant: null,         // name of the merchant character (detected from available by ctype)
    self: {                 // current character identity
      name: string,
      ctype: string,
      isMerchant: boolean,
    },
  },
  thresholds: {
    hpPotionPercent: 0.5,
    mpPotionPercent: 0.3,
    fleeHpPercent: 0.2,
  },
  toggles: {
    pvpDefense: true,
    autoUpgrade: false,
    recoveryEnabled: false,   // dev: cold start; prod: read persisted state on boot (R4)
  },
  restockThresholds: {
    potionsPerHunter: { hpot0: 100, hpot1: 50, mpot0: 100, mpot1: 50 },  // target potion counts (R23)
  },
  specialMonsters: ["phoenix", "mvampire"],
  friendlyPlayers: [],      // owner IDs of friendly players (alt accounts, friends)
  farmTarget: null,         // mtype string or null, from localStorage
}
// Note: gold baseline target (R54) is stored in localStorage (al_bot:merchant:goldBaseline),
// not in config — it is mutable merchant state, not static configuration.

```

## Behavior Contracts

### Roster Resolution

1. On boot, `get_characters()` is called to populate `roster.available` and `roster.characters`.
2. `roster.merchant` is auto-detected: the character with `ctype === "merchant"` from the available list.
3. `roster.self` is populated from the current `character` game global.
4. `roster.active` is read from `al_bot:config:activeRoster` in localStorage. If the key is absent or unparseable, `roster.active` defaults to all online characters from `roster.available`.

### Farm Target

1. `farmTarget` is read from `al_bot:config:farmTarget` in localStorage at boot.
2. If the key is absent, `farmTarget` is `null` (no target override — objective system decides).
3. The merchant is the intended writer of this key. Other characters read only.
4. Systems that need current farm target read from localStorage directly — config is immutable after boot.

### Static vs Dynamic

| Property | Source | When Updated |
|----------|--------|-------------|
| `roster.available`, `roster.characters` | `get_characters()` | Boot only |
| `roster.merchant`, `roster.self` | Derived from available | Boot only |
| `roster.active` | localStorage | Boot + `reload()` |
| `thresholds` | Hardcoded defaults | Boot only (future: localStorage override) |
| `toggles` | Hardcoded defaults | Boot only (future: localStorage override) |
| `specialMonsters` | Hardcoded defaults | Boot only |
| `farmTarget` | localStorage | Boot + `reload()` |

### Error Handling

1. If `get_characters()` fails or returns empty, `roster.available` is `[]` and `roster.merchant` is `null`. The system does not throw.
2. If localStorage keys contain invalid JSON, they are treated as absent. A warning is logged.

## localStorage Schema

| Key | Owner | Payload | Freshness |
|-----|-------|---------|-----------|
| `al_bot:config:activeRoster` | Merchant (manual/UI) | `["name1", "name2", ...]` JSON array of character names | Stable — updated manually |
| `al_bot:config:farmTarget` | Merchant | `"mtype"` string or `null` | Updated when merchant changes objective |

## Requirements Traceability

| Requirement | How Satisfied |
|-------------|---------------|
| R19 (centralized config) | All systems read from `ctx.config`; one structure, one place to update |
| R20 (tuning without redesign) | Thresholds and toggles are data, not code; `reload()` picks up localStorage changes |
| R46 (shared state schema) | localStorage keys have explicit owner, shape, and freshness |
| R48 (centralized thresholds) | `thresholds` object holds all numeric tuning parameters |
