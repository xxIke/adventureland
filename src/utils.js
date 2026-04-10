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
 * Post-MVP: requires per-target calculation with verified server formulas.
 * Kept as dormant code for future target-dependent DPS system.
 * @param {number} value - armor or resistance value
 * @returns {number} fraction of damage reduced (0 to <1)
 */
// function damageReduction(value) {
//   let reduction = 0;
//   let dropoff = 1;
//   let remaining = value;
//   while (remaining > 0) {
//     if (remaining >= 100) {
//       reduction += 0.1 * dropoff;
//     } else {
//       reduction += (remaining / 1000) * dropoff;
//     }
//     remaining -= 100;
//     dropoff *= 0.9;
//   }
//   return reduction;
// }

/**
 * Estimate combined DPS for a list of entities using basic attack * frequency.
 * MVP: no target-dependent calculations (armor, resistance, damage type).
 * @param {object[]} entities - array of entities with {attack, frequency}
 * @returns {{ basic_dps: number }} estimated DPS object (extensible for future fields)
 */
export function estimateDPS(entities) {
  let total = 0;
  for (const e of entities) {
    if (!e) continue;
    total += (e.attack || 0) * (e.frequency || 1);
  }
  return { basic_dps: total };
}

/**
 * Estimate time to kill a target entity given an estimated DPS.
 * @param {object} target - entity with {max_hp} (or G.monsters entry with {hp} as max_hp)
 * @param {{ basic_dps: number }} estimatedDPS - DPS estimate from estimateDPS()
 * @returns {{ basic_ttk: number }} estimated TTK in milliseconds (extensible for future fields)
 */
export function estimateTTK(target, estimatedDPS) {
  if (!target || !estimatedDPS || estimatedDPS.basic_dps <= 0) return { basic_ttk: Infinity };
  const hp = target.max_hp || target.hp || 0;
  if (hp <= 0) return { basic_ttk: 0 };
  return { basic_ttk: (hp / estimatedDPS.basic_dps) * 1000 };
}

/**
 * MVP farmability boolean — can the party survive and kill this monster type.
 * Uses basic_dps consistently on both sides (no target-dependent reduction).
 * @param {string} monsterType - monster type key for G.monsters lookup
 * @param {{ basic_dps: number }} partyEstimatedDPS - party DPS from estimateDPS()
 * @returns {boolean} true if party is projected to win
 */
export function canFight(monsterType, partyEstimatedDPS) {
  const monster = G.monsters[monsterType];
  if (!monster) return false;
  if (!partyEstimatedDPS || partyEstimatedDPS.basic_dps <= 0) return false;

  const ttk = estimateTTK(monster, partyEstimatedDPS);
  if (ttk.basic_ttk === Infinity) return false;

  const monsterDPS = estimateDPS([monster]);
  const maxTTK = 30000;
  const maxMonsterDPS = partyEstimatedDPS.basic_dps * 0.5;

  return ttk.basic_ttk <= maxTTK && monsterDPS.basic_dps <= maxMonsterDPS;
}

/**
 * Calculate farmability data for a monster type. Returns data for decision-making.
 * @param {string} monsterType - monster type key
 * @param {{ basic_dps: number }} partyEstimatedDPS - party DPS from estimateDPS()
 * @returns {object} { can_fight: boolean, gold_gain: number, xp_gain: number }
 */
export function getFarmabilityData(monsterType, partyEstimatedDPS) {
  const fight = canFight(monsterType, partyEstimatedDPS);
  const monster = G.monsters[monsterType];

  if (!fight || !monster || !partyEstimatedDPS || partyEstimatedDPS.basic_dps <= 0) {
    return { can_fight: false, gold_gain: 0, xp_gain: 0 };
  }

  const ttk = estimateTTK(monster, partyEstimatedDPS);

  let goldPerKill = 0;
  if (G.base_gold && G.base_gold[monsterType]) {
    const maps = G.base_gold[monsterType];
    const firstMap = Object.keys(maps)[0];
    if (firstMap) goldPerKill = maps[firstMap];
  }

  return {
    can_fight: true,
    gold_gain: ttk.basic_ttk > 0 ? goldPerKill / ttk.basic_ttk : 0,
    xp_gain: ttk.basic_ttk > 0 ? (monster.xp || 0) / ttk.basic_ttk : 0,
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
 * Check if an entity is friendly — consolidated check covering owner, party, friends,
 * config.friendlyPlayers, and roster membership.
 * @param {object} entity - entity to check (needs .owner, .party, .name)
 * @param {object} ctx - shared context with config
 * @returns {boolean} true if entity is friendly
 */
export function isFriendly(entity, ctx) {
  if (entity.owner === character.owner) return true;
  if (entity.party && character.party && entity.party === character.party) return true;
  if (character.friends?.includes(entity.owner)) return true;
  if (ctx?.config?.friendlyPlayers?.includes(entity.owner)) return true;
  if (ctx?.config?.roster?.available?.includes(entity.name)) return true;
  return false;
}

/**
 * Check if a character name belongs to a friendly player — for name-based checks
 * where no entity reference is available (CM senders, party invite/request names).
 * @param {string} name - character name to check
 * @param {object} ctx - shared context with config
 * @returns {boolean} true if name belongs to a friendly player
 */
export function isFriendlyName(name, ctx) {
  const roster = ctx?.config?.roster;
  if (roster?.available) {
    for (const c of roster.available) {
      if (typeof c === 'string' && c === name) return true;
      if (c && c.name === name) return true;
    }
  }
  const friends = ctx?.config?.friendlyPlayers || [];
  if (friends.length > 0) {
    for (const id in parent.entities) {
      const e = parent.entities[id];
      if (e && e.name === name && e.owner && friends.includes(e.owner)) return true;
    }
  }
  if (character.friends) {
    for (const id in parent.entities) {
      const e = parent.entities[id];
      if (e && e.name === name && character.friends.includes(e.owner)) return true;
    }
  }
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
//  Bank Operations
// ---------------------------------------------------------------------------

/**
 * Deposit non-whitelisted items into bank. Must be at bank NPC.
 * @param {string[]} whitelist - item names to keep in inventory
 * @returns {Promise<number>} number of items deposited
 */
export async function depositItems(whitelist) {
  const keep = new Set(whitelist || []);
  let deposited = 0;
  for (let i = 0; i < character.items.length; i++) {
    const item = character.items[i];
    if (item && !keep.has(item.name)) {
      try {
        await bank_store(i);
        deposited++;
      } catch (e) {
        // Slot may already be full or item locked — continue
      }
    }
  }
  return deposited;
}

/**
 * Retrieve specific items from bank vaults.
 * @param {string} itemName - item name to retrieve
 * @param {number} count - number of items to retrieve
 * @returns {Promise<number>} number of items retrieved
 */
export async function retrieveItem(itemName, count) {
  let retrieved = 0;
  if (!character.bank || count <= 0) return retrieved;
  for (const pack in character.bank) {
    const vault = character.bank[pack];
    if (!Array.isArray(vault)) continue;
    for (let slot = 0; slot < vault.length; slot++) {
      if (retrieved >= count) return retrieved;
      const item = vault[slot];
      if (item && item.name === itemName) {
        try {
          await bank_retrieve(pack, slot);
          retrieved += item.q || 1;
        } catch (e) {
          // Inventory full or item locked — stop
          return retrieved;
        }
      }
    }
  }
  return retrieved;
}

/**
 * Deposit excess gold and non-whitelisted items during bank visit.
 * @param {number} goldThreshold - gold amount to keep on hand
 * @param {string[]} whitelist - item names to keep in inventory
 * @returns {Promise<void>}
 */
export async function depositJunk(goldThreshold, whitelist) {
  if (character.gold > goldThreshold) {
    try {
      bank_deposit(character.gold - goldThreshold);
    } catch (e) {
      // Gold deposit failed — continue with items
    }
  }
  await depositItems(whitelist);
}

// ---------------------------------------------------------------------------
//  NPC/Vendor Utilities
// ---------------------------------------------------------------------------

/**
 * Purchase item from nearby NPC vendor.
 * @param {string} itemName - item name to buy
 * @param {number} [quantity=1] - quantity to purchase
 * @returns {Promise<void>}
 */
export async function buyItem(itemName, quantity) {
  await buy(itemName, quantity || 1);
}

/**
 * Sell item to nearby NPC vendor (Ponty).
 * @param {number} slot - inventory slot index
 * @param {number} [quantity] - quantity to sell (omit for entire stack/item)
 */
export function sellItem(slot, quantity) {
  sell(slot, quantity);
}

/**
 * Identify inventory items that should be sold to NPC.
 * Returns slot indices of sellable items (not in keepList, not quest items).
 * @param {string[]} keepList - item names to keep
 * @returns {number[]} array of inventory slot indices
 */
export function findSellableItems(keepList) {
  const keep = new Set(keepList || []);
  const sellable = [];
  for (let i = 0; i < character.items.length; i++) {
    const item = character.items[i];
    if (!item) continue;
    if (keep.has(item.name)) continue;
    const gItem = G.items[item.name];
    if (gItem?.quest) continue;
    if (gItem?.e) continue; // event items
    sellable.push(i);
  }
  return sellable;
}

// ---------------------------------------------------------------------------
//  Trade/Transfer Utilities
// ---------------------------------------------------------------------------

/**
 * Sell an item to a target's buy listing (trade slot with b flag).
 * Server auto-picks matching item from seller's inventory.
 * @param {object} target - entity object of the buyer
 * @param {string} tradeSlot - trade slot key (e.g., "trade1")
 * @param {number} [quantity=1] - quantity to sell
 * @returns {Promise}
 */
export function tradeSell(target, tradeSlot, quantity) {
  return trade_sell(target, tradeSlot, quantity || 1);
}

/**
 * Buy an item from a target's sell listing (trade slot without b flag).
 * @param {object} target - entity object of the seller
 * @param {string} tradeSlot - trade slot key (e.g., "trade1")
 * @param {number} [quantity=1] - quantity to buy
 * @returns {Promise}
 */
export function tradeBuy(target, tradeSlot, quantity) {
  return trade_buy(target, tradeSlot, quantity || 1);
}

/**
 * Send an inventory item directly to a nearby character.
 * @param {string|object} receiver - character name or entity
 * @param {number} slot - inventory slot index
 * @param {number} [quantity=1] - quantity to send
 * @returns {Promise}
 */
export function sendItem(receiver, slot, quantity) {
  return send_item(receiver, slot, quantity || 1);
}

/**
 * Send gold directly to a nearby character.
 * @param {string|object} receiver - character name or entity
 * @param {number} gold - amount of gold to send
 * @returns {Promise}
 */
export function sendGold(receiver, gold) {
  return send_gold(receiver, gold);
}

// ---------------------------------------------------------------------------
//  Item Classification Utilities
// ---------------------------------------------------------------------------

/**
 * Check if an item should be kept (not sent/sold). Used by trade system and sell classification.
 * Keeps: potions, scrolls, stand, tracker, quest items, event items.
 * @param {object} item - item object from character.items (must have .name)
 * @returns {boolean} true if item should be kept
 */
export function isKeepItem(item) {
  if (!item) return false;
  const name = item.name;
  if (name.startsWith('hpot') || name.startsWith('mpot')) return true;
  if (name.startsWith('scroll') || name.startsWith('cscroll')) return true;
  if (name === 'stand0' || name === 'tracker') return true;
  const gItem = G.items[name];
  if (gItem?.quest) return true;
  if (gItem?.e) return true;
  return false;
}

/**
 * Classify inventory items explicitly identified as NPC-sellable.
 * Only items positively identified as loot/junk are returned. Does NOT use a keepList approach.
 * @param {Array} [inv=character.items] - inventory array to classify
 * @returns {{ slot: number, item: object }[]} items to sell with their slot indices
 */
export function classifyForSale(inv) {
  const items = inv || character.items;
  const forSale = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    if (isKeepItem(item)) continue;
    forSale.push({ slot: i, item });
  }
  return forSale;
}

// ---------------------------------------------------------------------------
//  Gold Management Utilities
// ---------------------------------------------------------------------------

const GOLD_BASELINE_KEY = 'al_bot:merchant:goldBaseline';

/**
 * Read current gold baseline target from localStorage.
 * @returns {number|null} gold baseline, or null if not set
 */
export function getGoldBaseline() {
  try {
    const raw = localStorage.getItem(GOLD_BASELINE_KEY);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Write updated gold baseline to localStorage.
 * @param {number} newTarget - new gold baseline value
 */
export function updateGoldBaseline(newTarget) {
  try {
    localStorage.setItem(GOLD_BASELINE_KEY, JSON.stringify(newTarget));
  } catch (e) {
    // localStorage write failed — non-critical
  }
}
