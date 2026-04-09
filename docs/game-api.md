# Game API Reference

Shared reference for Adventure Land game API behavior relevant to bot design. Documents function semantics, cooldown groups, entity properties, and game mechanics that contracts and implementations must respect.

This is not a comprehensive API reference — it captures the subset of game behavior that has caused bugs or confusion in prior implementations.

## Cooldown Groups

The game has independent cooldown groups. Functions within a group share a cooldown; groups are independent of each other.

### Attack/Heal Group

| Function | Effect | Cooldown |
|----------|--------|----------|
| `attack(entity)` | Deal damage to target entity | Shared — derived from `character.frequency` |
| `heal(entity)` | Heal target entity (requires `character.heal > 0`) | Shared with `attack()` |

- A character can either attack or heal per cooldown cycle, not both.
- `attack()` and `heal()` are distinct game API functions — call whichever is intended.
- Cooldown period: `1000 / character.frequency` milliseconds.
- Both return promises. Fire-and-forget with `.catch()` for error handling.
- `can_attack(entity)` checks whether `attack()` can be called (range, cooldown, target validity).

### Recovery Group

| Function | Effect | Cooldown |
|----------|--------|----------|
| `use_skill('use_hp')` | Consume last HP potion in inventory | Shared via `parent.next_skill.use_hp` |
| `use_skill('use_mp')` | Consume last MP potion in inventory | Shared |
| `use_skill('regen_hp')` | Regenerate 50 HP (no potion consumed) | Shared — 2x potion cooldown |
| `use_skill('regen_mp')` | Regenerate 100 MP (no potion consumed) | Shared — 2x potion cooldown |

- Using a potion does NOT prevent attacking. Using attack does NOT prevent using a potion.
- `use_skill('use_hp')` with no HP potions in inventory performs a small HP regen at the 2x cooldown.
- `use_skill('use_mp')` with no MP potions in inventory performs a small MP regen at the 2x cooldown.
- `use_hp`/`use_mp` consume the **last** potion of that type in `character.items[]`. Consuming a specific tier requires swapping inventory slots first.
- Cooldown check: `Date.now() < parent.next_skill.use_hp`.

### Class Skill Cooldowns

Individual skills have independent cooldowns checked via `parent.next_skill[skill_name]` or `is_on_cooldown(skill_name)`. These are independent from both the attack/heal group and the recovery group.

## Entity Properties

### Position

| Property | Description |
|----------|-------------|
| `entity.x`, `entity.y` | Base position (updated on server ticks) |
| `entity.real_x`, `entity.real_y` | Interpolated position (client-side, more accurate for moving entities) |
| `entity.moving` | Boolean — whether the entity is currently moving |
| `entity.going_x`, `entity.going_y` | Destination coordinates when `entity.moving` is true |

**Rule**: Always use `real_x`/`real_y` for position calculations on moving entities. Use `going_x`/`going_y` for movement prediction (where the entity is heading).

### Combat State

| Property | Description |
|----------|-------------|
| `entity.target` | Name of entity's current target (set by both `attack()` and `heal()`) |
| `entity.targets` | Count of entities currently targeting this entity |
| `entity.dead` | Boolean — entity is dead |
| `entity.rip` | Boolean — character is dead (character-specific) |
| `entity.hp`, `entity.max_hp` | Current and maximum HP |
| `entity.mp`, `entity.max_mp` | Current and maximum MP |
| `entity.attack` | Attack damage value |
| `entity.heal` | Heal amount — if > 0, character can heal. Currently only priest has this stat, but the system treats it as a capability check, not a class check. |
| `entity.frequency` | Attack speed (attacks per second) |
| `entity.range` | Attack/heal range |
| `entity.speed` | Movement speed |
| `entity.armor` | Physical damage reduction — every 100 armor reduces physical damage by 10% (diminishing) |
| `entity.resistance` | Magical damage reduction — every 100 resistance reduces magical damage by 10% (diminishing) |

**Important**: `entity.target` is set by **both** `attack()` and `heal()`. A priest healing a party member will have their `target` set to that party member's name. Naive hostile detection based on `entity.target` will misclassify healers as hostile.

### Entity Classification

| Property | Values | Notes |
|----------|--------|-------|
| `entity.type` | `"character"`, `"monster"`, `"npc"` | |
| `entity.mtype` | Monster type string (e.g., `"goo"`, `"bee"`) | Monsters only |
| `entity.ctype` | Character class (e.g., `"warrior"`, `"priest"`, `"merchant"`) | Characters only |
| `entity.owner` | Account owner name | Characters only |
| `entity.party` | Party name/id | `undefined`/`null` if not in a party |
| `entity.visible` | Boolean — entity is visible | |
| `entity.xp` | XP reward | Negative XP = non-combatant (e.g., puppies) |
| `entity.id` | Unique entity identifier | |
| `entity.name` | Display name | |

### Inventory and Slots

| Property | Description |
|----------|-------------|
| `character.items[]` | Inventory array — `null` for empty slots, item objects for occupied |
| `entity.slots` | Equipment/trade slots object — keys include `trade1`-`trade30` for trade listings |

## Movement Functions

| Function | Use Case | Notes |
|----------|----------|-------|
| `move(x, y)` | Short-distance direct movement | Immediate, no pathfinding. Use for combat repositioning. |
| `smart_move(destination)` | Long-distance travel with pathfinding | Returns a promise. `destination` can be a map name, monster type string, or `{x, y, map}` object. |
| `stop()` | Cancel current movement | Stops both `move()` and `smart_move()` in progress. |
| `is_moving()` | Check if character is currently moving | |

**Rule**: Use `move(x, y)` for combat repositioning (kiting, approach, flee). Use `smart_move()` only for cross-map travel. Avoid calling `smart_move()` multiple times concurrently — cancel the previous one first.

## Party Functions

| Function | Description |
|----------|-------------|
| `send_party_invite(name)` | Send a party invite to a character. Used by the party leader/oldest character. |
| `send_party_request(name)` | Request to join another character's party. Used by non-leader characters. |
| `get_party()` | Returns object of current party members keyed by name. Empty object if not in party. |

**`get_party()` return shape**: Object keyed by character name with member info. Empty object if not in a party.

**Note**: `send_party_invite` is for the party leader to invite others. `send_party_request` is for non-leaders to request joining. Both are one-way — acceptance callbacks need verification against the live game API.

## Code Messages (CM)

| Function | Description |
|----------|-------------|
| `send_cm(name, data)` | Send a code message to another character. `data` is any serializable object. |

**Receiving CMs**: Assign a handler to the global `on_cm`:
```js
on_cm = function(sender, data) {
  // sender: string (character name)
  // data: object (the payload sent via send_cm)
}
```

CMs are real-time, per-character messages. Use for active coordination that needs a triggered response. Rate-limited by the game server.

## Other Functions

| Function | Description |
|----------|-------------|
| `distance(entity_a, entity_b)` | Euclidean distance between two entities |
| `in_attack_range(entity)` | Whether entity is within character's attack range |
| `change_target(entity)` | Update the game UI target indicator |
| `loot()` | Pick up all nearby chests |
| `get_chests()` | Returns object of nearby lootable chests — check before calling `loot()` |
| `swap(slot_a, slot_b)` | Swap two inventory slots |
| `get_characters()` | Returns list of account's characters with online status |
| `game_log(text)` | Display text in the game log |
| `set_message(text)` | Set the character's overhead status message |
| `use_skill(skill_name, target?)` | Use a skill (class skills, recovery skills) |

## Character Properties

| Property | Description |
|----------|-------------|
| `character.targets` | Count of entities currently targeting this character |
| `character.party` | Party name/id (`undefined`/`null` if not in party) |
| `character.owner` | Account owner name |
| `character.ctype` | Character class |
| `character.friends` | Friends list — **structure needs verification** against live game |

## Game Data (`G`)

The global `G` object contains static game reference data loaded at startup. The `G` structure separates template data (monsters, NPCs, items) from placement data (in maps). Full type definitions are available in the ALClient reference (`reference/ALClient/source/definitions/adventureland-data.ts`).

### Maps (`G.maps[mapName]`)

Each map contains placement data for spawns, NPCs, monsters, doors, and zones:

```js
G.maps[mapName] = {
  name: string,
  spawns: [[x, y, direction?, radius?], ...],  // player spawn points
  doors: [...],                                 // portal/door definitions
  npcs: [{
    id: string,              // NPC identifier (e.g., "goldnpc", "items4")
    name: string,            // human-readable name
    position: [x, y, dir?],  // NPC location on this map
    positions: [[x, y], ...], // optional: multiple positions (walking path)
    boundary: [x1, y1, x2, y2], // optional: movement boundary
  }, ...],
  monsters: [{
    type: string,            // monster type (e.g., "goo", "bee")
    count: number,           // pack size
    boundary: [x1, y1, x2, y2], // spawn zone [minX, minY, maxX, maxY]
    boundaries: [...],       // optional: multiple spawn boundaries
    polygon: [[x, y], ...], // optional: non-rectangular spawn area
    grow: boolean,           // monsters level up over time
    roam: boolean,           // monsters roam beyond boundary
    rage: [x1, y1, x2, y2], // optional: aggro chase boundary
    stype: string,           // optional: special spawn type (e.g., "randomrespawn")
  }, ...],
  zones: [{                  // fishing/mining zones
    type: string,
    polygon: [...],
    drop: string,
  }, ...],
  ref: {},                   // pre-computed position references for NPCs
}
```

**NPC positions are on the map, not on the NPC definition.** Access via `G.maps[mapName].npcs[].position`.

### NPCs (`G.npcs[npcId]`)

NPC template metadata (role, items sold, quest type). Does NOT contain position — position is in the map data.

```js
G.npcs[npcId] = {
  id: string,
  name: string,
  role: string,      // "merchant", "items", "guard", "quest", etc.
  items: [...],       // items this NPC sells (if merchant role)
  quest: string,      // quest type (if quest NPC)
  class: string,      // NPC class type
}
```

### Monsters (`G.monsters[monsterType]`)

Monster template stats. Does NOT contain position — spawn locations are in map pack data.

```js
G.monsters[monsterType] = {
  name: string,
  hp: number,
  attack: number,
  armor: number,
  resistance: number,
  speed: number,
  range: number,
  frequency: number,   // attack speed
  xp: number,          // can be negative (non-combatant)
  aggro: number,       // aggro range
  damage_type: string,
  respawn: number,     // respawn time in seconds (-1 = special)
  abilities: {},       // skill configurations
  immune: boolean,
  cooperative: boolean,
  peaceful: boolean,
  roam: boolean,
  stationary: boolean,
}
```

### Items (`G.items[itemName]`)

Item template metadata.

```js
G.items[itemName] = {
  name: string,
  type: string,        // "weapon", "armor", "ring", "potx", etc.
  g: number,           // gold value (NPC price)
  upgrade: {},         // upgrade stat multipliers (truthy = upgradeable)
  compound: {},        // compound stat multipliers (truthy = compoundable)
  class: string[],     // class restrictions
  wtype: string,       // weapon type
  // stat attributes: str, dex, int, vit, attack, armor, hp, mp, etc.
}
```

### Monster Growth Model

`G.monsters[type]` contains **level 1 base stats only**. Monsters in `grow` packs level up over time on the server. There is **no max level** — monsters keep leveling indefinitely. The bot sees current stats on live entities, but preemptive pack assessment requires estimating stats at higher levels.

Growth formulas derived from server code (`server.js:level_monster`, `server.js:calculate_monster_stats`):

**Per-level scaling with NO cap** (scales linearly forever):

| Stat | Per level gained |
|------|-----------------|
| `max_hp` | `+= floor(base_hp / 2)` |
| `xp` | `+= base_xp` |

**Per-level scaling capped at level 12** (stat multiplier uses `min(level, 12)`):

| Stat | `grow` pack | Non-grow pack |
|------|-------------|---------------|
| `attack` | `base * (1 + min(lvl,12) * 0.05)` | `base * (1 + min(lvl,12) * 0.125)` |
| `frequency` | `base + min(lvl,12) * 0.008` | `base + min(lvl,12) * 0.034` |
| `speed` | `base + min(lvl,12) * 0.16` | `base + min(lvl,12) * 0.24` |

**Key implication**: A level 20 monster has the same attack/speed/frequency as level 12, but significantly more HP and XP. HP is the primary danger scaling at high levels.

**Leveling rate** (server-side, `server.js:14377`): Time between levels increases exponentially: `2^((level-1) * 0.3)` factor. Higher-level monsters take much longer to level further. Special monsters level 20x slower; `1hp` monsters level 200x slower.

**Pack `grow` flag**: Only packs with `grow: true` in `G.maps[map].monsters[]` level up. Non-grow packs stay at level 1.

**Night effect**: During night schedule, monster speed is reduced to `ceil(speed * 0.7)`. Reflected on live entities.

### Other G Data

| Path | Contents |
|------|----------|
| `G.skills` | Skill definitions (cooldowns, ranges, costs) |
| `G.classes` | Character class stat tables |
| `G.conditions` | Status effect definitions |
| `G.drops` | Drop tables for monsters, maps |
| `G.geometry[mapName]` | Map visual boundaries, collision data |

## Item and Bank Functions

| Function | Description |
|----------|-------------|
| `upgrade(item_slot, scroll_slot)` | Upgrade an item using a scroll. Returns promise. |
| `compound(slot1, slot2, slot3, scroll_slot)` | Compound three items using a scroll. Returns promise. |
| `buy(item_name, quantity?)` | Purchase item from nearby NPC vendor. Returns promise. |
| `sell(item_slot, quantity?)` | Sell item to nearby NPC vendor. |
| `bank_deposit(gold_amount)` | Deposit gold into bank (must be at bank). |
| `bank_withdraw(gold_amount)` | Withdraw gold from bank (must be at bank). |
| `trade(item_slot, trade_slot, price, quantity)` | List item for trade in a trade slot. |
| `item_grade(item)` | Returns scroll grade needed for upgrade/compound (0, 1, or 2). |
| `item_value(item)` | Returns NPC sell value of an item. |
| `open_stand()` | Open merchant stand for trading. |
| `close_stand()` | Close merchant stand. |

**`character.bank`**: Object containing bank vault arrays. Each vault key maps to an array of items (or `null` for empty slots). Also contains a `"gold"` key with the deposited gold amount. Only accessible when character is at the bank NPC.

## Unverified / Needs Testing

- Exact structure of `character.friends` (flat array? object? keyed by name or owner?)
- Whether `swap()` is synchronous or requires awaiting before `use_skill()` will see the new inventory state
- Exact behavior of `smart_move()` cancellation — does `stop()` cause the promise to reject?
- Exact party acceptance callback mechanism (socket events vs global handlers)
- Whether `G.maps[mapName].ref` provides pre-resolved NPC positions for all maps
