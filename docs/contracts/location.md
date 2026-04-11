---
utility: Location
writes: nothing
reads: nothing
game_globals:
  - G.maps
  - G.npcs
  - G.monsters
  - character
---

# Location Contract

## Identity

The Location module is a shared **utility** for resolving named destinations to coordinates using the game's static data (`G.maps`, `G.npcs`). It provides a single, centralized answer to "where is X?" — NPCs, monster spawns, map keywords.

**Not a system**: No tick function, no scheduler registration, no `ctx` ownership. Pure functions that take game data as input and return coordinate objects.

**Consumers**: Objective (primary — uses location service to set `ctx.objective.location`), potentially other systems that need to resolve coordinates.

## Public Interface

### `resolveLocation(destination)`

Unified entry point for location resolution. Accepts multiple input types and returns a standardized coordinate object.

**Parameters:**
- `destination` (string | object) — one of:
  - NPC id string (e.g., `'secondhands'`, `'goldnpc'`) — resolved via `findNPCLocation()`
  - Monster type string (e.g., `'bee'`, `'crab'`) — resolved via `findMonsterLocation()`
  - Keyword string (e.g., `'bank'`, `'upgrade'`, `'potions'`) — resolved via NPC role lookup in `G.npcs`
  - Coordinate object `{ x, y, map }` — passed through as-is

**Returns:** `{ coord: { x: number, y: number, map: string } }` or `null` if destination cannot be resolved.

**Resolution order:**
1. If `destination` is an object with `x`, `y`, `map` properties, return it wrapped in `{ coord: destination }`.
2. Check `G.npcs[destination]` — if exists, delegate to `findNPCLocation(destination)`.
3. Check `G.monsters[destination]` — if exists, delegate to `findMonsterLocation(destination)`.
4. Check keyword mapping: match `destination` against NPC roles in `G.npcs` (e.g., `'bank'` matches role `'banker'`). Delegate to `findNPCLocation()` with matched id.
5. Return `null` if no match.

### `findNPCLocation(npcId)`

Locates an NPC by id across all maps. This is the **single interface** for locating any NPC — bank, Ponty, upgrade NPC, potion vendor, etc. are all located via `findNPCLocation(id)` with appropriate NPC ids.

**Parameters:**
- `npcId` (string) — NPC identifier as used in `G.maps[map].npcs[].id` (e.g., `'secondhands'` for Ponty, `'goldnpc'` for bank)

**Returns:** `{ coord: { x: number, y: number, map: string } }` or `null` if NPC not found.

**Resolution:**
- Iterate `G.maps`. For each map, search `map.npcs[]` for entry with matching `id`.
- Use `npc.position[0]` for x, `npc.position[1]` for y.
- If NPC has `positions` array (walking path), use first position as canonical location.
- Return first match found.

### `findMonsterLocation(monsterType)`

Locates the primary spawn location for a monster type. Separate from NPC lookup because monster spawns use a different data structure (`G.maps[].monsters[]` boundaries vs `G.maps[].npcs[]` positions).

**Parameters:**
- `monsterType` (string) — monster type key (e.g., `'bee'`, `'crab'`, `'goo'`)

**Returns:** `{ coord: { x: number, y: number, map: string } }` or `null` if monster type not found.

**Resolution:**
- Iterate `G.maps`. For each map, search `map.monsters[]` for entry with matching `type`.
- If `pack.boundary` exists: return center of boundary `[x1, y1, x2, y2]`.
- If `pack.boundaries` exists: return center of first boundary.
- Return first match found.

### `getMonsterSpawns(monsterType)`

Returns all spawn locations for a monster type across all maps, with boundary data.

**Parameters:**
- `monsterType` (string) — monster type key

**Returns:** `Array<{ coord: { x, y, map }, boundary: [x1, y1, x2, y2], count: number }>` — empty array if not found.

**Resolution:**
- Iterate all maps and collect all matching monster packs.
- Include boundary (or first of `boundaries`), center coordinate, and pack `count`.

### `getMapTransitions(mapName)`

Returns available transitions (doors, transporters) from a given map. Foundation for future cross-map pathfinding (R34).

**Parameters:**
- `mapName` (string) — map identifier (e.g., `'main'`, `'cave'`)

**Returns:** `Array<{ type: 'door' | 'transporter', position: { x, y }, targetMap: string, targetSpawn: number }>` — empty array if map not found.

**Resolution:**
- Read `G.maps[mapName].doors[]` for door transitions.
- Read `G.maps[mapName].npcs[]` for transporter NPCs (NPCs with transport role).
- Normalize both into the return format.

## Design Notes

- All functions are **pure** (stateless) relative to game data — they read `G.maps`/`G.npcs` which are static after game load.
- `character` is only used if proximity-aware resolution is needed (future enhancement — e.g., "nearest bank across maps").
- Functions are imported directly by consuming systems/strategies — they are not on `ctx`.
- No per-NPC convenience wrappers (`findBankLocation`, `findPontyLocation`, etc.) — use `findNPCLocation(id)` with the appropriate NPC id.

## Requirements Traceability

| Requirement | How Satisfied |
|-------------|---------------|
| R33 (map POI) | `findNPCLocation()`, `getMonsterSpawns()` provide queryable location set from game data |
| R34 (NPC navigation) | `findNPCLocation(npcId)` resolves any NPC to coordinates; `getMapTransitions()` exposes cross-map connections |
