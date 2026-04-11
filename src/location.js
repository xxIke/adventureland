/**
 * Location — shared utility for resolving named destinations to coordinates.
 *
 * Pure functions using G.maps, G.npcs, G.monsters game data.
 * Not a system — no scheduler registration, no ctx ownership.
 * Used by Objective (primary consumer) and potentially other systems.
 */

/**
 * Keyword-to-lookup mapping for common destination names not directly
 * found in G.maps, G.npcs, or G.monsters.
 * Each entry maps to either { type: 'npc', id } or { type: 'map', id }.
 */
const KEYWORD_MAP = {
  ponty: { type: 'npc', id: 'secondhands' },
  sell: { type: 'npc', id: 'secondhands' },
};

/**
 * Locate an NPC by id across all maps. Single interface for all NPC lookups.
 *
 * @param {string} npcId - NPC identifier (e.g., 'secondhands', 'goldnpc')
 * @returns {{ coord: { x: number, y: number, map: string } } | null}
 */
export function findNPCLocation(npcId) {
  if (!G || !G.maps) return null;

  for (const mapName in G.maps) {
    const mapData = G.maps[mapName];
    if (!mapData.npcs) continue;

    for (const npc of mapData.npcs) {
      if (npc.id === npcId) {
        // Walking NPCs have positions array; use first position as canonical
        if (npc.positions && npc.positions.length > 0) {
          return {
            coord: {
              x: npc.positions[0][0],
              y: npc.positions[0][1],
              map: mapName,
            },
          };
        }
        if (npc.position) {
          return {
            coord: {
              x: npc.position[0] || 0,
              y: npc.position[1] || 0,
              map: mapName,
            },
          };
        }
      }
    }
  }
  return null;
}

/**
 * Locate the primary spawn location for a monster type.
 * Returns the center of the first matching spawn boundary.
 *
 * @param {string} monsterType - Monster type key (e.g., 'bee', 'crab')
 * @returns {{ coord: { x: number, y: number, map: string } } | null}
 */
export function findMonsterLocation(monsterType) {
  if (!G || !G.maps) return null;

  for (const mapName in G.maps) {
    const mapData = G.maps[mapName];
    if (!mapData.monsters) continue;

    for (const pack of mapData.monsters) {
      if (pack.type === monsterType) {
        if (pack.boundary) {
          const [x1, y1, x2, y2] = pack.boundary;
          return {
            coord: {
              x: Math.round((x1 + x2) / 2),
              y: Math.round((y1 + y2) / 2),
              map: mapName,
            },
          };
        }
        if (pack.boundaries && pack.boundaries.length > 0) {
          const [x1, y1, x2, y2] = pack.boundaries[0];
          return {
            coord: {
              x: Math.round((x1 + x2) / 2),
              y: Math.round((y1 + y2) / 2),
              map: mapName,
            },
          };
        }
      }
    }
  }
  return null;
}

/**
 * Unified entry point for location resolution.
 * Accepts NPC id, monster type, map name, keyword, or coordinate object.
 *
 * Resolution order:
 * 1. Object with x, y, map → pass through
 * 2. Map name (G.maps) → first spawn point
 * 3. NPC id (G.npcs) → findNPCLocation
 * 4. Monster type (G.monsters) → findMonsterLocation
 * 5. Keyword mapping → lookup table
 *
 * @param {string|object} destination
 * @returns {{ coord: { x: number, y: number, map: string } } | null}
 */
export function resolveLocation(destination) {
  if (!destination) return null;

  // Coordinate object pass-through
  if (typeof destination === 'object' && destination.map !== undefined) {
    return { coord: destination };
  }

  if (typeof destination !== 'string') return null;

  // Map name check
  if (G && G.maps && G.maps[destination]) {
    const mapData = G.maps[destination];
    if (mapData.spawns && mapData.spawns.length > 0) {
      const spawn = mapData.spawns[0];
      return {
        coord: {
          x: spawn[0] || 0,
          y: spawn[1] || 0,
          map: destination,
        },
      };
    }
    // Map exists but no spawn data — return origin
    return { coord: { x: 0, y: 0, map: destination } };
  }

  // NPC id check
  if (G && G.npcs && G.npcs[destination]) {
    return findNPCLocation(destination);
  }

  // Monster type check
  if (G && G.monsters && G.monsters[destination]) {
    return findMonsterLocation(destination);
  }

  // Keyword mapping
  const keyword = KEYWORD_MAP[destination.toLowerCase()];
  if (keyword) {
    if (keyword.type === 'npc') return findNPCLocation(keyword.id);
    if (keyword.type === 'map') return resolveLocation(keyword.id);
  }

  return null;
}

/**
 * Get all spawn locations for a monster type across all maps.
 *
 * @param {string} monsterType - Monster type key
 * @returns {Array<{ coord: { x: number, y: number, map: string }, boundary: number[]|null, count: number }>}
 */
export function getMonsterSpawns(monsterType) {
  if (!G || !G.maps) return [];

  const spawns = [];
  for (const mapName in G.maps) {
    const mapData = G.maps[mapName];
    if (!mapData.monsters) continue;

    for (const pack of mapData.monsters) {
      if (pack.type !== monsterType) continue;

      const boundary = pack.boundary || (pack.boundaries && pack.boundaries[0]) || null;
      if (boundary) {
        const [x1, y1, x2, y2] = boundary;
        spawns.push({
          coord: {
            x: Math.round((x1 + x2) / 2),
            y: Math.round((y1 + y2) / 2),
            map: mapName,
          },
          boundary,
          count: pack.count || 1,
        });
      }
    }
  }
  return spawns;
}

/**
 * Get available transitions (doors, transporters) from a given map.
 * Foundation for future cross-map pathfinding (R34).
 *
 * @param {string} mapName - Map identifier
 * @returns {Array<{ type: string, position: { x: number, y: number }, targetMap: string, targetSpawn: number }>}
 */
export function getMapTransitions(mapName) {
  if (!G || !G.maps || !G.maps[mapName]) return [];

  const transitions = [];
  const mapData = G.maps[mapName];

  // Doors
  if (mapData.doors) {
    for (const door of mapData.doors) {
      // Door format varies; typically [x, y, width, height, targetMap, targetSpawn, ...]
      if (door && door.length >= 6) {
        transitions.push({
          type: 'door',
          position: { x: door[0], y: door[1] },
          targetMap: door[4],
          targetSpawn: door[5],
        });
      }
    }
  }

  // Transporter NPCs
  if (mapData.npcs) {
    for (const npc of mapData.npcs) {
      if (!npc.id) continue;
      const npcData = G.npcs && G.npcs[npc.id];
      if (npcData && npcData.role === 'transport') {
        const pos = npc.position || [0, 0];
        transitions.push({
          type: 'transporter',
          position: { x: pos[0], y: pos[1] },
          targetMap: npcData.places ? Object.keys(npcData.places)[0] : null,
          targetSpawn: 0,
        });
      }
    }
  }

  return transitions;
}
