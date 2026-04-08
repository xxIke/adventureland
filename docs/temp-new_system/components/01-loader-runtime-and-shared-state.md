# Loader, Runtime, and Shared State

## Purpose

Own startup, module initialization, loop lifecycle, and browser-side shared state conventions.

## Responsibilities

- runtime bootstrap
- dependency validation
- loop registration and teardown
- localStorage key conventions and ownership
- optional CM protocol bootstrap

## Dependencies

- game loader/runtime
- config
- shared utility modules

## Explicit non-responsibilities

- target selection policy
- combat math
- merchant planning

## Candidate design patterns

### `load_code` layered numbering

- Pros:
  - native to Adventure Land
  - quick to iterate without external tooling
- Cons:
  - brittle ordering
  - hard to refactor safely
  - weak visibility into dependencies

### Generated single-bundle output

- Pros:
  - removes most file-order pain
  - supports real modular source structure
  - aligns with PBot’s strongest architectural idea
- Cons:
  - introduces build tooling
  - adds one more step to deployment

### Hybrid loader plus logical modules

- Pros:
  - keeps some in-game modularity while reducing full bundle dependence
  - lower tooling commitment
- Cons:
  - preserves some `load_code()` fragility
  - easy to regress into tangled numbering

## Recommended default pattern

Use generated single-bundle output for the fresh implementation source, with a single clear entry point and explicit loop ownership.

## Notes about known AdventureLand/browser constraints

- Browser-native persistence is limited; shared-state keys must be documented.
- Each loop should be owned by one module and re-scheduled from one place only.
- CM and localStorage should be treated as explicit coordination channels, not ambient shared memory.
