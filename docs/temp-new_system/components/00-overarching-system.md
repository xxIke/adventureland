# Overarching System

## Purpose

Define the top-level architecture for a browser-native AdventureLand bot that remains maintainable while handling party play, merchant support, and progression-aware objectives.

## Responsibilities

- define subsystem boundaries
- define control flow between strategy and execution
- define how shared world knowledge is represented
- define where shared state and coordination live

## Dependencies

- game runtime globals
- shared config
- chosen loader/build approach

## Explicit non-responsibilities

- custom client infrastructure
- host-machine services
- external analytics server

## Candidate design patterns

### Modular monolith with strict subsystem boundaries

- Pros:
  - fits browser-native constraints well
  - easy to reason about in a single runtime
  - avoids process/interface overhead
- Cons:
  - requires discipline to prevent boundary erosion
  - can still decay into a monolith if ownership is weak

### Hierarchical state-machine centered system

- Pros:
  - maps well to bot modes and transitions
  - easy to debug state at a high level
- Cons:
  - can become rigid if every decision is forced into state transitions
  - weak for nuanced scoring among many concurrent opportunities

### Blackboard/world-model centered system

- Pros:
  - encourages separation between observation and decision
  - good fit for shared party and merchant knowledge
- Cons:
  - requires discipline around freshness and ownership
  - can become an unstructured dumping ground

### Job/task-driven coordinator over subsystem executors

- Pros:
  - good for merchant workflows and long-running objectives
  - creates a clean bridge between strategy and action
- Cons:
  - more abstraction than needed for all combat decisions
  - can become heavy for a browser-native v1

## Recommended default pattern

Use a modular monolith with a centralized world model and hierarchical state control.

This keeps the runtime simple while still enforcing the main separation the prior art lacked:

- world model observes
- state/objective control decides
- movement/combat/merchant modules execute

## Notes about known AdventureLand/browser constraints

- One runtime per character strongly favors modular monolith over distributed architecture.
- Shared-state mechanisms are limited, so the architecture should keep coordination simple and explicit.
- Build-time bundling is likely the cleanest way to preserve subsystem boundaries without `load_code()` chaos.
