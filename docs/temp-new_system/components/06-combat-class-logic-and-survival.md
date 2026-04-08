# Combat, Class Logic, and Survival

## Purpose

Own target choice execution, attack/heal timing, skill usage, and survival behavior.

## Responsibilities

- target prioritization execution
- heal vs attack handling
- class-skill policy
- sustain and panic behavior

## Dependencies

- world model
- movement module
- state/objective control
- game-data knowledge

## Explicit non-responsibilities

- choosing global farming objectives
- merchant supply planning

## Candidate design patterns

### Per-class procedural handlers

- Pros:
  - easy to start
  - maps closely to Adventure Land skill differences
- Cons:
  - duplicated shared logic
  - difficult to tune consistently

### Shared combat engine plus class policy hooks

- Pros:
  - strongest balance of reuse and specialization
  - keeps common targeting/sustain logic centralized
- Cons:
  - requires deliberate interface design

### Priority-rule system for target and skill decisions

- Pros:
  - easier to tune than hardcoded branching
  - produces a better debug story
- Cons:
  - may feel abstract if overused too early

## Recommended default pattern

Use a shared combat engine plus class policy hooks, with priority-rule style evaluation for target and skill decisions.

## Notes about known AdventureLand/browser constraints

- Priest/healer logic, ranged kiting, and hostile-player response should share common scaffolding but not identical policies.
- Survival behavior must explicitly account for potion timing, dangerous mechanics, and regrouping.
