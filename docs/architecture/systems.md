# Systems

Each system is an independent module that receives the shared context (`ctx`) and registers with the scheduler. This document defines each system's purpose, responsibilities, and boundaries.

## WorldModel

**Purpose**: Translate raw game state into a queryable, categorized local model.

**Responsibilities**: Poll game globals (`character`, `parent.entities`, `G`), categorize entities (party members, hostile monsters, hostile players, objective targets, special monsters, trade candidates), expose query helpers for other systems.

**Reads**: Game API globals directly.
**Writes**: `ctx.world` (sole writer).
**Events emitted**: Entity change signals when significant state changes occur (new hostile, party member down).
**Scheduling**: Moderate frequency (~250-500ms). Must run before systems that consume `ctx.world`.

**Requirements**: R5, R6

---

## Objective

**Purpose**: Decide what the bot should be doing and when to switch modes.

**Responsibilities**: Maintain current high-level state (idle, farming, repositioning, recovering). Choose farming targets based on party capability. Trigger state transitions. Coordinate with merchant and party objective channels.

**Reads**: `ctx.world`, `ctx.config`, localStorage (farm target overrides).
**Writes**: Current objective state (on `ctx` or own state).
**Events emitted**: `objective:changed` when the bot's goal changes.
**Events consumed**: Party directives, event notifications.
**Scheduling**: Low-moderate frequency (~1-2s). Decisions don't need sub-second timing.

**Requirements**: R15, R16, R30, R31

---

## Combat

**Purpose**: Execute target selection, attacks, skills, and survival behavior.

**Responsibilities**: Select priority target from world model entities. Execute attacks and class-specific skills via strategy. Manage threat response (hostile players). Coordinate with movement for repositioning.

**Reads**: `ctx.world` (entities, character state), current objective.
**Writes**: None to shared state.
**Events emitted**: `movement:request` for repositioning, `combat:target-changed`.
**Events consumed**: `objective:changed` (may swap strategy).
**Scheduling**: High frequency (~100-200ms), adaptive based on cooldown state.
**Strategies**: Per-class (warrior, priest, mage, ranger, etc.) + situational (flee, defensive).

**Requirements**: R11, R12, R14, R40, R41

---

## Movement

**Purpose**: Handle all character movement — travel, rallying, repositioning, kiting.

**Responsibilities**: Long-distance travel (wrapping `smart_move` initially). Local combat repositioning (maintain distance, kite). Rally/follow behavior for party travel. Recovery from interrupted movement.

**Reads**: `ctx.world` (entity positions, map context), current objective.
**Writes**: None to shared state.
**Events consumed**: `movement:request` from combat or party, `objective:changed`.
**Scheduling**: High frequency (~100-250ms) when actively repositioning, low frequency when traveling.
**Strategies**: Travel vs. combat repositioning vs. kiting vs. follow.

**Requirements**: R9, R10

---

## Party

**Purpose**: Coordinate the merchant and hunters around shared objectives, party integrity, and supplies.

**Responsibilities**: Party assembly and maintenance (invite, join, re-invite). Cross-character messaging via CM protocol. Objective dissemination from leader. Shared status snapshots in localStorage.

**Reads**: `ctx.world` (party members), `ctx.config` (roster), localStorage (status snapshots).
**Writes**: localStorage (party status snapshots).
**Events emitted**: Party directives, supply requests.
**Events consumed**: `objective:changed`, CM messages from other characters.
**Scheduling**: Low-moderate frequency (~1-2s). Party state doesn't change rapidly.

**Requirements**: R7, R8

---

## Merchant

**Purpose**: Own inventory management, supply workflows, item improvement, and economy.

**Responsibilities**: Monitor hunter supply needs. Restock workflow (gather, travel, deliver, collect). Upgrade and compound workflows. Trade evaluation. Bank interactions. Item cataloging.

**Reads**: `ctx.world`, `ctx.config`, localStorage (wishlists, stock state).
**Writes**: localStorage (merchant status, inventory snapshots).
**Events consumed**: Supply requests from party, `objective:changed`.
**Scheduling**: Low-moderate frequency (~1-2s). Merchant workflows are multi-step, not latency-sensitive.
**Strategies**: Workflow phases (restock, upgrade, compound, sell, deliver).

**Requirements**: R21–R29

**Note**: Only active on merchant character. Hunters don't load this system.

---

## Potion/Regen

**Purpose**: Manage HP/MP consumable use on a dedicated cycle.

**Responsibilities**: Evaluate HP and MP state. Select appropriate potion or regen action. Prefer available and legal recovery options. Avoid wasting potions when regen suffices.

**Reads**: `ctx.world` (character HP/MP, inventory potions).
**Writes**: None to shared state.
**Scheduling**: High frequency (~50-200ms). Potion timing is latency-sensitive — delayed potions cause deaths.

**Requirements**: R13

---

## Logging

**Purpose**: Make the bot understandable and debuggable during development and unattended operation.

**Responsibilities**: Structured log collection from all systems. State and status snapshots. Runtime metrics. Debug surface for current objective and state. Periodic persistence of log snapshots.

**Reads**: `ctx.world`, all system states, scheduler instrumentation.
**Writes**: localStorage (log snapshots, status snapshots).
**Events consumed**: All significant events (for logging context).
**Scheduling**: Low frequency (~2-5s). Logging is not latency-sensitive.

**Requirements**: R17, R18, R44, R45
