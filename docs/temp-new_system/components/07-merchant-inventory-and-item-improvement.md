# Merchant, Inventory, and Item Improvement

## Purpose

Own item awareness, banking, supply, trading, and improvement workflows.

## Responsibilities

- item cataloging
- bank interactions
- equipment comparisons
- restock workflows
- upgrade/compound workflows
- trade evaluation

## Dependencies

- world model
- communication layer
- progression policies
- map/NPC knowledge

## Explicit non-responsibilities

- low-level hunter combat
- generalized objective state machine for all roles

## Candidate design patterns

### Monolithic merchant state machine

- Pros:
  - straightforward to understand
  - aligns with prior-art merchant flows
- Cons:
  - easily becomes too large
  - mixes planning and execution heavily

### Workflow/task queue

- Pros:
  - good for long-running jobs like restock and upgrades
  - clear execution steps
- Cons:
  - extra abstraction for simple merchant actions

### Policy evaluator producing merchant jobs

- Pros:
  - separates decision-making from operational steps
  - scales well as merchant complexity grows
- Cons:
  - more design effort up front

## Recommended default pattern

Use a policy evaluator producing merchant jobs, executed through a bounded workflow queue.

## Notes about known AdventureLand/browser constraints

- Merchant behavior naturally spans many maps and long-running actions, so job semantics are useful here sooner than in combat logic.
- LocalStorage snapshots are appropriate for wishlist and stock state if their schema is explicit.
