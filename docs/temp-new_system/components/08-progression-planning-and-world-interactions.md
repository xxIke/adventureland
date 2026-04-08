# Progression Planning and World Interactions

## Purpose

Choose valuable objectives using actual game systems: farming, hunts, events, upgrades, recipes, tokens, and map interactions.

## Responsibilities

- evaluate candidate objectives
- connect item goals to farming and improvement goals
- reason about world interaction prerequisites
- track when events or hunts deserve attention

## Dependencies

- game-data knowledge
- merchant/inventory subsystem
- world model
- state/objective control

## Explicit non-responsibilities

- executing combat loops
- handling low-level movement details

## Candidate design patterns

### Hardcoded progression path

- Pros:
  - easy to ship initially
  - deterministic
- Cons:
  - brittle
  - poor reuse across classes and changing goals

### Config-driven target lists

- Pros:
  - easier to tune than hardcoded branching
  - good near-term discipline
- Cons:
  - can still become static and manual

### Utility scoring over farm targets, upgrades, hunts, and events

- Pros:
  - best fit for dynamic progression
  - can incorporate current stock, gear, and capability
- Cons:
  - requires careful scoring design and observability

## Recommended default pattern

Use config-driven target lists for initial safety, but structure the subsystem so utility scoring can gradually take over objective ranking.

## Notes about known AdventureLand/browser constraints

- The reference data is rich, but a browser-native bot should use only the subset needed for decisions.
- Event and hunt support should start with a curated list of worthwhile scenarios rather than full content coverage.
