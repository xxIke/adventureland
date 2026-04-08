# World Model and Entity Processing

## Purpose

Translate raw game state into a queryable local model that other components can trust.

## Responsibilities

- observe self, party, monsters, hostile players, NPC context, and trade candidates
- categorize entities
- maintain derived target sets
- expose query helpers for decisions

## Dependencies

- game globals
- map and game-data knowledge

## Explicit non-responsibilities

- choosing long-term objectives
- issuing combat actions directly

## Candidate design patterns

### Direct polling and ad hoc queries

- Pros:
  - simple to start
  - low abstraction cost
- Cons:
  - duplicated logic
  - inconsistent targeting behavior
  - poor debug story

### Centralized tracked-entity repository

- Pros:
  - strong fit with all prior art
  - shared source of truth for target selection and coordination
  - easier logging and debugging
- Cons:
  - needs clear freshness rules
  - can grow into a god-object if not scoped

### Event-assisted world model with polling refresh

- Pros:
  - can react quickly to attacks, death, and party changes
  - reduces reliance on one heavy polling path
- Cons:
  - more complex
  - still needs polling as a safety net

## Recommended default pattern

Use a centralized tracked-entity repository refreshed by polling, with selective event hooks for important state changes.

## Notes about known AdventureLand/browser constraints

- Polling is unavoidable, but it should populate a structured repository rather than feed every subsystem directly.
- Derived categories should include at least:
  - party members
  - hostile monsters
  - hostile players
  - objective monsters
  - special monsters
  - trade candidates
