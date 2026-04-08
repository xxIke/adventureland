# Phase 3: Hunt Together

Implement party coordination and objective systems. Multiple combat bots move and hunt as a synchronized group.

## Scope

### Party System
- Party assembly: detect missing members, send/accept invites from roster
- CM message protocol: typed messages with sender identification
- Message types: objective directive, status update, rally command, supply request
- Shared status snapshots in localStorage (who is alive, current state, HP%)

### Objective System
- Maintain current high-level state (idle, farming, traveling, recovering)
- Accept farm target from localStorage override or hardcoded default
- Disseminate objective to party via CM
- Trigger state transitions based on party state and world conditions
- Emit `objective:changed` events for combat and movement strategy swaps

### Coordinated Movement
- Follow/rally behavior: hunters follow party leader or rally to a position
- Travel as a group to farm locations
- Movement system consumes party directives for coordinated repositioning

## Prerequisites

- Phase 2 complete (individual characters can farm)
- Contracts authored: `contracts/party.md`, `contracts/objective.md`

## Acceptance Criteria

1. Characters automatically form a party from configured roster
2. Party recovers from member disconnects (re-invite on reconnect)
3. Farm target set in localStorage is read by objective system and communicated to party
4. All hunters travel to the same farm location
5. Hunters fight the same target pack as a coordinated group
6. Party status is readable from localStorage by any character
7. Changing the farm target in localStorage causes the party to relocate

## Requirements Addressed

R7 (party maintenance), R8 (cross-character communication), R15 (separated intent/execution), R16 (universal + role states), R30 (party-capability targeting)
