# Context Map

Structured definition of what each system writes to and reads from `ctx`. Each `ctx.*` slot has exactly one writer. Systems read shared context but only write to their own slot.

## Shared Context Slots

```yaml
ctx:
  world:
    writer: WorldModel
    shape:
      specialMonsters: Entity[]
      targetMonsters: Entity[]
      easyMonsters: Entity[]
      hostileMonsters: Entity[]
      hostilePlayers: Entity[]
      partyMembers: Entity[]
      charactersOfferingTrade: Entity[]
      lastUpdated: number

  objective:
    writer: Objective
    shape:
      type: string               # 'farm' | 'travel' | 'recover' | 'idle' | 'follow' | 'event' | 'restock' | 'upgrade' | 'compound' | 'sell' | 'wander'
      target: string | null      # monster type string for farm objectives; null otherwise
      location: Location | null  # { coord: { x, y, map } } — extensible location object
      step: string | null        # current step within multi-step workflows
      stepComplete: boolean      # has the current step been accomplished
      role: string               # 'hunter' | 'merchant'
      lastUpdated: number

  targeting:
    writer: Targeting
    shape:
      attackTarget: Entity | null
      healTarget: Entity | null
      lastUpdated: number

  config:
    writer: Configuration (boot-time, reload on demand)
    shape:
      roster:
        available: string[]
        active: string[]
        characters: object   # name -> { name, ctype, online }
        merchant: string | null
        self: { name, ctype, isMerchant }
      thresholds:
        hpPotionPercent: number
        mpPotionPercent: number
        fleeHpPercent: number
      toggles:
        pvpDefense: boolean
        autoUpgrade: boolean
      specialMonsters: string[]
      friendlyPlayers: string[]
      farmTarget: string | null

  party:
    writer: Party
    shape:
      tank: string | null      # name of the party tank, recalculated on membership change

  bus:
    writer: EventBus (infrastructure)
    purpose: logging and diagnostic signals only

  scheduler:
    writer: Scheduler (infrastructure)
    purpose: system registration, timing, lifecycle

  logger:
    writer: Logger (infrastructure)
    purpose: structured logging interface
```

## Per-System Context Dependencies

```yaml
WorldModel:
  writes: ctx.world
  reads:
    - ctx.config.specialMonsters
    - ctx.config.farmTarget
    - ctx.config.friendlyPlayers
  game_globals:
    - character
    - parent.entities

Objective:
  writes: ctx.objective
  reads:
    - ctx.world
    - ctx.config
  game_globals:
    - character
  external:
    - localStorage (farm target, merchant status, party coordination)

Targeting:
  writes: ctx.targeting
  reads:
    - ctx.world
    - ctx.objective
    - ctx.config
  game_globals:
    - character
    - distance()

Attack:
  writes: nothing
  reads:
    - ctx.targeting.attackTarget
    - ctx.targeting.healTarget
  game_globals:
    - character
    - attack()
    - heal()
    - can_attack()
    - loot()
    - get_chests()
    - change_target()

CombatSkills:
  writes: nothing
  reads:
    - ctx.targeting.attackTarget
  game_globals:
    - character
    - use_skill()
    - is_on_cooldown()
    - parent.next_skill

MerchantSkills:
  writes: nothing
  reads:
    - ctx.world.partyMembers
    - ctx.world.charactersOfferingTrade
  game_globals:
    - character
    - use_skill()
    - is_on_cooldown()

Movement:
  writes: nothing
  reads:
    - ctx.objective.type
    - ctx.objective.location.coord
    - ctx.targeting.attackTarget
    - ctx.targeting.healTarget
    - ctx.world.hostileMonsters
    - ctx.world.hostilePlayers
    - ctx.party.tank
    - ctx.config.thresholds.fleeHpPercent
  game_globals:
    - character
    - move()
    - smart_move()
    - stop()
    - distance()

Party:
  writes: ctx.party (tank identification; also writes to localStorage and sends CMs)
  reads:
    - ctx.world.partyMembers
    - ctx.objective.type
    - ctx.objective.target
    - ctx.config.roster
    - ctx.config.friendlyPlayers
  game_globals:
    - character
    - send_cm()
  external:
    - localStorage (party status snapshots)

PotionRegen:
  writes: nothing
  reads:
    - ctx.world.hostileMonsters
    - ctx.world.hostilePlayers
  game_globals:
    - character (hp, max_hp, mp, max_mp, targets, items, rip)
    - parent.next_skill.use_hp
    - use_skill()
    - swap()

Logging:
  writes: nothing on ctx (writes to localStorage)
  reads:
    - ctx.world
    - ctx.objective
    - ctx.targeting
    - ctx.config
    - ctx.scheduler.getStats()
  game_globals:
    - character
    - game_log()
    - set_message()
  external:
    - localStorage (log snapshots)
```

## Execution Order

Systems that write `ctx.*` slots must run before systems that read those slots:

```
1. WorldModel     -> writes ctx.world
2. Objective      -> writes ctx.objective (reads ctx.world)
3. Targeting      -> writes ctx.targeting (reads ctx.world, ctx.objective)
4. Party          -> writes ctx.party (reads ctx.world, ctx.config)
5. All others     -> read only (Attack, CombatSkills, Movement, PotionRegen, Logging)
```

Party writes `ctx.party.tank` which Movement reads for kite decisions. Party should run before Movement in the scheduling order. Other group 5 systems have no ordering dependency on each other.
