# Objective Selection and State Control

## Purpose

Choose what the bot is trying to accomplish and when to switch modes.

## Responsibilities

- maintain current high-level state
- choose next objective
- trigger transitions
- coordinate with merchant or party objective channels

## Dependencies

- world model
- config
- progression policies
- communication layer

## Explicit non-responsibilities

- low-level movement execution
- direct skill timing

## Candidate design patterns

### Flat FSM

- Pros:
  - easy to understand
  - simple debug surface
- Cons:
  - becomes awkward as modes and sub-modes grow
  - hard to represent shared universal behavior cleanly

### Hierarchical FSM

- Pros:
  - natural fit for universal plus role-specific states
  - preserves readable transitions
  - matches strongest prior-art patterns
- Cons:
  - still requires policy for choosing among candidate objectives

### Utility-scored objective selector with stateful executors

- Pros:
  - handles competing opportunities well
  - supports progression-aware decisions
- Cons:
  - harder to debug if adopted too early everywhere

### Behavior tree

- Pros:
  - expressive for layered decision logic
- Cons:
  - more structure than needed for this problem initially
  - less aligned with the dominant prior-art mental model

## Recommended default pattern

Use a hierarchical FSM for execution modes, with optional utility scoring only at objective-selection points.

## Notes about known AdventureLand/browser constraints

- Explicit state is valuable in browser-native bots because debugging options are limited.
- States should capture mode and transition intent, not every micro-decision.
