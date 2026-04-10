/**
 * Shared utility functions for game API interactions.
 *
 * Utilities are NOT systems — they don't register with the scheduler or write to ctx.
 * They are pure(ish) functions that strategies and systems call for common game interactions.
 * Game globals (character, parent, G) are accessed directly.
 */

// ---------------------------------------------------------------------------
//  Inventory Utilities
// ---------------------------------------------------------------------------

/**
 * Find all inventory slot indices containing items matching the given name.
 * @param {string} itemName - item name to search for
 * @param {Array} [inv=character.items] - inventory array to search
 * @returns {number[]} array of slot indices (0-based), empty if not found
 */
export function findItemSlots(itemName, inv) {
  const items = inv || character.items;
  const slots = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i] && items[i].name === itemName) {
      slots.push(i);
    }
  }
  return slots;
}

/**
 * Find the last inventory slot containing a specific potion type/tier, for swap-before-use.
 * The game's use_hp/use_mp consumes the last potion of that type, so callers swap
 * the desired tier to this position before use_skill.
 * @param {string} potionType - "hp" or "mp"
 * @param {string} tier - potion tier name (e.g., "hpot0", "hpot1", "hpotx")
 * @returns {number|null} slot index of the last matching potion, or null if not found
 */
export function findPotionSlot(potionType, tier) {
  const items = character.items;
  let lastSlot = null;
  for (let i = 0; i < items.length; i++) {
    if (items[i] && items[i].name === tier) {
      lastSlot = i;
    }
  }
  return lastSlot;
}

/**
 * Find first empty (null) slot in inventory.
 * @param {Array} [inv=character.items] - inventory array
 * @returns {number|null} slot index, or null if inventory is full
 */
export function findEmptySlot(inv) {
  const items = inv || character.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i] === null) return i;
  }
  return null;
}

/**
 * Count total quantity of an item across inventory (respects q for stackable items).
 * @param {string} itemName - item name to count
 * @param {Array} [inv=character.items] - inventory array
 * @returns {number} total quantity (0 if not found)
 */
export function countItem(itemName, inv) {
  const items = inv || character.items;
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item && item.name === itemName) {
      total += item.q || 1;
    }
  }
  return total;
}

/**
 * Build item catalogue from inventory or bank, grouping by name and level for equipment.
 * @param {Array} inv - inventory array to catalogue
 * @returns {object} { [name]: { [level]: count, max: number } } for equipment,
 *                   { [name]: number } for stackables
 */
export function catalogInventory(inv) {
  const catalogue = {};
  for (let i = 0; i < inv.length; i++) {
    const item = inv[i];
    if (!item) continue;

    if (item.level !== undefined) {
      if (!catalogue[item.name]) {
        catalogue[item.name] = { max: item.level };
      }
      const entry = catalogue[item.name];
      entry[item.level] = (entry[item.level] || 0) + 1;
      if (item.level > entry.max) entry.max = item.level;
    } else {
      catalogue[item.name] = (catalogue[item.name] || 0) + (item.q || 1);
    }
  }
  return catalogue;
}

// ---------------------------------------------------------------------------
//  Equipment/Gear Utilities
// ---------------------------------------------------------------------------

/**
 * Determine if candidate item is an upgrade over currently equipped item.
 * MVP: same name + higher level = upgrade. Multi-slot (ring1/ring2, earring1/earring2)
 * requires comparing against both slots — that is the caller's responsibility.
 * @param {object} candidate - item object with {name, level}
 * @param {object|null} equipped - currently equipped item, or null if slot is empty
 * @returns {boolean} true if candidate is better
 */
export function isUpgrade(candidate, equipped) {
  if (!equipped) return true;
  return candidate.name === equipped.name && candidate.level > equipped.level;
}

/**
 * Determine which equipment slot an item belongs to using G.items and G.classes data.
 * @param {string} itemName - item name to look up
 * @returns {string|undefined} slot name (e.g., "mainhand", "ring1"), undefined if not equippable
 */
export function getSlotForItem(itemName) {
  const itemData = G.items[itemName];
  if (!itemData || !itemData.type) return undefined;

  const type = itemData.wtype || itemData.type;
  const slots = getClassWeaponTypes();

  for (const slot in slots) {
    if (slots[slot].includes(type)) return slot;
  }

  for (const slot in character.slots) {
    if (slot.includes(type)) return type;
  }

  return undefined;
}

/**
 * Get valid weapon/item types per equipment slot for a character class.
 * @param {string} [ctype=character.ctype] - class type
 * @returns {object} { [slot]: string[] } mapping slot names to valid item types
 */
export function getClassWeaponTypes(ctype) {
  const classType = ctype || character.ctype;
  const classData = G.classes[classType];
  const validTypes = {};
  const slotKeys = Object.keys(character.slots);

  for (const attr in classData) {
    if (attr !== 'doublehand' && !slotKeys.includes(attr)) continue;
    validTypes[attr] = [];
    const types = classData[attr];
    for (const t in types) {
      validTypes[attr].push(t);
    }
  }

  return validTypes;
}

// ---------------------------------------------------------------------------
//  Movement/Position Utilities
// ---------------------------------------------------------------------------

/**
 * Check if character is within distance of a target location, accounting for map.
 * @param {object} target - { x, y, map? } location to check
 * @param {number} [maxDist=10] - maximum distance
 * @returns {boolean} true if within distance and on same map
 */
export function nearLocation(target, maxDist) {
  if (maxDist === undefined) maxDist = 10;
  if (target.map && target.map !== character.map) return false;
  return distance(character, target) <= maxDist;
}

/**
 * Calculate unit vector from character's current position toward a point.
 * @param {object} point - { x, y } target point
 * @returns {object} { x, y } normalized unit vector
 */
export function getUnitVectorTo(point) {
  const dx = point.x - character.real_x;
  const dy = point.y - character.real_y;
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: dx / mag, y: dy / mag };
}

/**
 * Calculate unit vector from a point away toward character (opposite of getUnitVectorTo).
 * @param {object} point - { x, y } source point
 * @returns {object} { x, y } normalized unit vector pointing away from the point
 */
export function getUnitVectorFrom(point) {
  const dx = character.real_x - point.x;
  const dy = character.real_y - point.y;
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: dx / mag, y: dy / mag };
}

// ---------------------------------------------------------------------------
//  Monster/Farming Utilities
// ---------------------------------------------------------------------------

/**
 * Diminishing-returns damage reduction from armor or resistance.
 * Each 100 points gives 10% reduction with 0.9x multiplier per successive 100.
 * Partial last block is proportional.
 * @param {number} value - armor or resistance value
 * @returns {number} fraction of damage reduced (0 to <1)
 */
function damageReduction(value) {
  let reduction = 0;
  let dropoff = 1;
  let remaining = value;
  while (remaining > 0) {
    if (remaining >= 100) {
      reduction += 0.1 * dropoff;
    } else {
      reduction += (remaining / 1000) * dropoff;
    }
    remaining -= 100;
    dropoff *= 0.9;
  }
  return reduction;
}

/**
 * Estimate damage per second for an attacker, factoring damage type and target armor/resistance.
 * Uses attack * frequency * damage_mult * hit_rate formula.
 * @param {object} attacker - entity or G.monsters entry with {attack, frequency, damage_type}
 * @param {object} [target] - entity with {armor, resistance} for damage reduction calc
 * @returns {number} estimated DPS
 */
export function estimateDPS(attacker, target) {
  let damageMult = 1;
  let hitRate = 1;

  let damageType = null;
  if (attacker.slots && attacker.slots.mainhand) {
    damageType = G.items[attacker.slots.mainhand.name].damage_type;
  } else if (attacker.damage_type) {
    damageType = attacker.damage_type;
  }

  if (target && damageType) {
    if (damageType === 'physical') {
      damageMult *= 1 - damageReduction(target.armor || 0);
      if (target.evasion) hitRate -= target.evasion / 100;
    } else if (damageType === 'magical') {
      damageMult *= 1 - damageReduction(target.resistance || 0);
    }
  }

  return (attacker.attack || 0) * (attacker.frequency || 1) * damageMult * hitRate;
}

/**
 * Estimate time to kill a monster type at level 1 stats using party DPS.
 * @param {string} monsterType - monster type key for G.monsters lookup
 * @param {number} partyDPS - combined party DPS from estimateDPS
 * @returns {number} estimated milliseconds to kill
 */
export function estimateTTK(monsterType, partyDPS) {
  if (partyDPS <= 0) return Infinity;
  const monster = G.monsters[monsterType];
  if (!monster) return Infinity;
  return (monster.hp / partyDPS) * 1000;
}

/**
 * MVP farmability boolean — can the party survive and kill this monster type.
 * Simple comparison: can party sustain against monster DPS and kill within reasonable time.
 * @param {string} monsterType - monster type key
 * @param {object} partyStats - { basic_dps, tank, ... } from al_bot:party:stats
 * @returns {boolean} true if party is projected to win
 */
export function canFight(monsterType, partyStats) {
  const monster = G.monsters[monsterType];
  if (!monster) return false;
  if (!partyStats || !partyStats.basic_dps || partyStats.basic_dps <= 0) return false;

  const ttk = estimateTTK(monsterType, partyStats.basic_dps);
  if (ttk === Infinity) return false;

  const monsterDPS = estimateDPS(monster);
  const maxTTK = 30000;
  const maxMonsterDPS = partyStats.basic_dps * 0.5;

  return ttk <= maxTTK && monsterDPS <= maxMonsterDPS;
}

/**
 * Calculate farmability data for a monster type. MVP returns data for future decision-making,
 * NOT comparative ROI. Each value calculated by dedicated functions for independent tuning.
 * @param {string} monsterType - monster type key
 * @param {object} partyStats - party stats from localStorage
 * @returns {object} { can_fight: boolean, gold_gain: number, xp_gain: number }
 *                   gold_gain = gold(lvl1) / ttk(lvl1), xp_gain = xp(lvl1) / ttk(lvl1)
 */
export function getFarmabilityData(monsterType, partyStats) {
  const fight = canFight(monsterType, partyStats);
  const monster = G.monsters[monsterType];

  if (!fight || !monster || !partyStats || partyStats.basic_dps <= 0) {
    return { can_fight: false, gold_gain: 0, xp_gain: 0 };
  }

  const ttk = estimateTTK(monsterType, partyStats.basic_dps);

  let goldPerKill = 0;
  if (G.base_gold && G.base_gold[monsterType]) {
    const maps = G.base_gold[monsterType];
    const firstMap = Object.keys(maps)[0];
    if (firstMap) goldPerKill = maps[firstMap];
  }

  return {
    can_fight: true,
    gold_gain: ttk > 0 ? goldPerKill / ttk : 0,
    xp_gain: ttk > 0 ? (monster.xp || 0) / ttk : 0,
  };
}

// ---------------------------------------------------------------------------
//  Stand Management Utilities
// ---------------------------------------------------------------------------

/**
 * Open merchant stand for trading. Wrapper over game API open_stand().
 */
export function openStand() {
  open_stand();
}

/**
 * Close merchant stand. Wrapper over game API close_stand().
 */
export function closeStand() {
  close_stand();
}

/**
 * Check if merchant stand is currently open via character.stand property.
 * @returns {boolean} true if stand is open
 */
export function isStandOpen() {
  return !!character.stand;
}

// ---------------------------------------------------------------------------
//  Skill/Combat Utilities
// ---------------------------------------------------------------------------

/**
 * Check if a skill is on cooldown, following the G.skills share chain.
 * Wraps game API is_on_cooldown() for consistent interface.
 * @param {string} skillName - skill name to check
 * @returns {boolean} true if skill is on cooldown
 */
export function isOnCooldown(skillName) {
  return is_on_cooldown(skillName);
}

/**
 * Calculate milliseconds remaining until a skill is available.
 * Follows the G.skills share chain to resolve the actual cooldown source.
 * @param {string} skillName - skill name to check
 * @returns {number} ms remaining (0 if available)
 */
export function getCooldownRemaining(skillName) {
  let resolved = skillName;
  while (G.skills[resolved] && G.skills[resolved].share) {
    resolved = G.skills[resolved].share;
  }
  const expiry = parent.next_skill[resolved];
  if (!expiry) return 0;
  return Math.max(0, expiry - Date.now());
}

// ---------------------------------------------------------------------------
//  Party/Entity Utilities
// ---------------------------------------------------------------------------

/**
 * Check if an entity belongs to a friendly player (same owner or in friendlyPlayers config).
 * @param {object} entity - entity to check, must have entity.owner
 * @returns {boolean} true if entity is owned by a friendly player
 */
export function isFriendly(entity) {
  if (entity.owner === character.owner) return true;
  if (entity.party && entity.party === character.party) return true;
  if (character.friends && character.friends.includes(entity.owner)) return true;
  return false;
}

/**
 * Filter roster to only online characters.
 * @param {object} roster - roster config with characters map { name -> { online } }
 * @returns {string[]} array of online character names
 */
export function getActiveCharacters(roster) {
  if (!roster || !roster.characters) return [];
  const active = [];
  for (const name in roster.characters) {
    if (roster.characters[name].online) {
      active.push(name);
    }
  }
  return active;
}

// ---------------------------------------------------------------------------
//  Bank Operations (Phase 4 — signatures only)
// ---------------------------------------------------------------------------

/**
 * Deposit non-whitelisted items into bank.
 * @param {string[]} whitelist - item names to keep in inventory
 */
export function depositItems(whitelist) {
  throw new Error('Phase 4: not yet implemented');
}

/**
 * Retrieve specific items from bank vaults.
 * @param {string} itemName
 * @param {number} count
 */
export function retrieveItem(itemName, count) {
  throw new Error('Phase 4: not yet implemented');
}

/**
 * Deposit excess gold and non-whitelisted items during bank visit.
 * @param {number} goldThreshold
 * @param {string[]} whitelist
 */
export function depositJunk(goldThreshold, whitelist) {
  throw new Error('Phase 4: not yet implemented');
}

// ---------------------------------------------------------------------------
//  NPC/Vendor Utilities (Phase 4 — signatures only)
// ---------------------------------------------------------------------------

/**
 * Purchase item from nearby NPC vendor.
 * @param {string} itemName
 * @param {number} quantity
 */
export function buyItem(itemName, quantity) {
  throw new Error('Phase 4: not yet implemented');
}

/**
 * Sell item to nearby NPC vendor (Ponty).
 * @param {number} slot
 * @param {number} [quantity]
 */
export function sellItem(slot, quantity) {
  throw new Error('Phase 4: not yet implemented');
}

/**
 * Identify inventory items that should be sold to NPC.
 * @param {string[]} keepList
 */
export function findSellableItems(keepList) {
  throw new Error('Phase 4: not yet implemented');
}

// ---------------------------------------------------------------------------
//  Gold Management Utilities (Phase 4 — signatures only)
// ---------------------------------------------------------------------------

/**
 * Read current gold baseline target from localStorage.
 */
export function getGoldBaseline() {
  throw new Error('Phase 4: not yet implemented');
}

/**
 * Write updated gold baseline to localStorage.
 * @param {number} newTarget
 */
export function updateGoldBaseline(newTarget) {
  throw new Error('Phase 4: not yet implemented');
}
