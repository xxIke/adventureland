# Intent: Recovery

Covers death handling, respawn, state persistence across disconnects, and recovery after browser reload.

---

## Death Detection

- **What**: Detect `character.rip` state across all systems so they idle appropriately
- **MVP**: All systems check `character.rip` and return idle/recovery behavior. Objective switches to 'recover' type.
- **End-state**: Same — detection is simple and complete.
- **Notes**: Currently all systems handle death. No gaps.

## Auto-Respawn

- **What**: Call `respawn()` after death with appropriate delay, then resume operation
- **MVP**: Auto-respawn after configurable delay (e.g., 15 seconds). Resume previous objective after respawn. Log death event with context (what killed us, where).
- **End-state**: Smart respawn — if died to a monster that's too strong, don't resume same farm target. If died in PvP zone, respawn at safe location. Track death frequency — if dying repeatedly, escalate (change farm target, request merchant resupply, alert via CM). Await potential revive from priest
- **Notes**: hyper-fixate uses 15s delay. `respawn()` is a simple game API call. The delay prevents rapid death loops. Current implementation does NOT call respawn() — character stays dead until manual intervention or game auto-respawn.
- **Game behavior**: No built-in auto-respawn. Minimum death window exists (all cooldowns reset by respawn). Respawn places character in town. Character must travel back to farm zone after respawn.
- **Priest revive**: Untested, but revive may mitigate/prevent death penalty. Desired end-state: wait briefly for possible priest revive before auto-respawning. If revived, character avoids respawn penalty and stays at current location.

## State Recovery After Respawn

- **What**: After respawning, restore the bot's operational state (objective, farm target, configuration) rather than starting from scratch
- **MVP**: Objective system re-evaluates on next tick after respawn. Since config persists in memory and objective reads config.farmTarget, the bot should naturally resume farming after respawn without explicit state restoration.
- **End-state**: Track pre-death state explicitly. If farming, return to same farm zone. If mid-resupply, resume the workflow step. If following, rejoin leader. Death should be a temporary interruption, not a reset.
- **Notes**: The current architecture may handle this naturally — objective re-evaluates each tick, so after respawn it should detect farmTarget and transition to travel/farm. Needs live testing to confirm.
- **Notes (additional)**: Respawn is in town. For MVP, objective re-evaluates on next tick and naturally resumes (detect farmTarget → travel → farm). End-state handles deaths more strategically (death avoidance, farm target change if dying repeatedly).

## State Persistence on Disconnect

- **What**: Periodically save bot state to localStorage so it survives browser disconnects/reconnects
- **MVP**: Save current objective type, farm target, and party configuration to localStorage on a timer (e.g., every 30 seconds). On boot, configuration.js already reads farmTarget and activeRoster from localStorage. Extend to persist objective state.
- **End-state**: Full state snapshot — objective (type, target, step, location), last known party composition, inventory summary, farm metrics (kills/hour, deaths, loot value). Enable "resume where I left off" after any interruption.
- **Notes**: v2 backed up full bot state every 30s. Current implementation persists config (farmTarget, activeRoster) and party status snapshots but not objective state. The gap is small for MVP since objective derives from config, but matters for multi-step merchant workflows.
- **Disconnect frequency**: Server instability disconnects are rare. Rate-limit disconnects depend on bot responsiveness.
- **Persistence timing**: Persist on major state changes + every 5 minutes (300s). 30s is more often than necessary.
- **Persistence data is always written** regardless of recovery mode setting.
    

## State Recovery After Reload

- **What**: On browser reload/reconnect, restore operational state from localStorage rather than cold-starting
- **MVP**: Configuration already restores from localStorage (farmTarget, activeRoster). Objective re-evaluates from config on first tick. Party re-forms automatically via invite/request cycle. Effectively, the bot self-heals within 1-2 tick cycles of reload.
- **End-state**: Explicit recovery sequence on boot — detect if this is a fresh start or a recovery (check localStorage for recent state snapshot). If recovery, restore objective directly instead of re-deriving. Log recovery event. For merchant, resume multi-step workflow at the interrupted step rather than restarting from idle.
- **Notes**: The architecture's stateless-tick design (each system re-derives from ctx each tick) means most recovery is implicit. The main gap is multi-step merchant workflows where step progress would be lost without explicit persistence.
- **No game signal** for reconnect vs fresh load.
- **Recovery control**: Dev/production flag in configuration controls whether system attempts state recovery on boot. Set false during development/testing (cold start), true for long-running production operation.
  - Flag controls whether on-boot the system reads persisted state. Persistence writing always happens regardless.
  - Previous approach (data freshness: <10m = resume, >10m = fresh start) is less important for this architecture since objective re-derives from config each tick. Main gap is multi-step merchant workflows where step progress would be lost.
  - The stateless-tick design (each system re-derives from ctx each tick) provides implicit recovery for most systems.
