# Movement and Navigation

## Purpose

Handle travel, rallying, repositioning, and kiting through one movement interface.

## Responsibilities

- long-distance travel
- local repositioning
- maintain-distance logic
- recovery from interrupted movement

## Dependencies

- world model
- objective/state control
- map knowledge

## Explicit non-responsibilities

- deciding what target to fight
- choosing strategic objectives

## Candidate design patterns

### `smart_move` wrapper only

- Pros:
  - simplest implementation
  - low effort for non-combat travel
- Cons:
  - not enough for nuanced kiting or rally behavior
  - hides less control than desired

### Custom move manager over `smart_move` and local repositioning

- Pros:
  - pragmatic for browser-native bots
  - lets travel and combat movement coexist cleanly
- Cons:
  - still limited by underlying runtime movement capabilities

### Route planner plus local steering layer

- Pros:
  - strongest long-term architecture
  - clean split between travel path and local movement
- Cons:
  - higher implementation cost
  - easy to overbuild too early

## Recommended default pattern

Use a custom move manager over `smart_move` and local repositioning, with room to add a route-planning layer later.

## Notes about known AdventureLand/browser constraints

- Travel and kiting are different problems and should not share one naive movement routine.
- Rally support matters for party safety during transitions.
