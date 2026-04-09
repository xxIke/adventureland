---
name: spec-plan
description: Generate or review specifications and implementation plans for a component. Drives the M1 documentation chain from intent through contracts. Use when starting a new component, feature, or significant change that needs documented requirements and design before implementation.
---

## Overview

Structured specification and planning workflow that produces the documentation chain required by M1 before implementation can begin. Takes user intent and produces requirements, architecture/design decisions, and contract definitions.

## Use When

- Starting a new component or significant feature
- User describes what they want built but documentation doesn't exist yet
- M1 gate blocks implementation due to missing docs
- User says "plan", "spec", "design", or "requirements" for a component

## Don't Use When

- Documentation already exists and is implementation-ready (use implement)
- Reviewing existing documentation (use doc-review)
- Making minor changes to an already-documented component

## Steps

1. **Capture intent.** Understand what the user wants:
   - What problem does this solve?
   - Who are the users/consumers?
   - What are the constraints (performance, security, compatibility)?
   - What is out of scope?

2. **Requirements specification.** Document functional and non-functional requirements:
   - Each requirement is specific, testable, and non-contradictory
   - Error conditions and edge cases are addressed
   - Dependencies on other components are explicit
   - Acceptance criteria are defined

3. **Architecture and design.** Document how the requirements will be satisfied:
   - Component boundaries and responsibilities
   - Data flow and state management
   - Integration points and external dependencies
   - Key tradeoffs with rationale (why this approach over alternatives)
   - Security considerations

4. **Contract definitions.** Define stable interfaces:
   - API contracts (input/output specifications, error responses)
   - Behavior contracts (invariants, preconditions, postconditions)
   - Integration contracts (how components communicate)
   - Context Dependencies section (yaml block defining ctx writes and reads, per pattern in existing contracts). Reference `docs/architecture/context-map.md` as canonical ctx ownership.
   - Each contract is specific enough for contract-based testing (M5)

5. **Implementation plan.** Break implementation into phases:
   - Phase ordering respects M3 (core before dependent)
   - Each phase has clear deliverables and testable outcomes
   - Shared solutions identified for M4 centralization
   - Test strategy per phase (see `standards/testing.md` postures)

6. **Review gate.** Before implementation proceeds:
   - Does every requirement have at least one contract?
   - Could a developer implement from these docs alone?
   - Are error conditions and edge cases covered?
   - Is the test strategy defined?

7. **Save artifacts.** Write documentation to the component's canonical docs location:
   - `docs/requirements.md`
   - `docs/design.md`
   - `docs/contracts.md`
   - Adjust paths to match project conventions

## Assumption Boundary — STOP If

- User's intent is unclear — ask clarifying questions
- Requirements conflict with existing documented contracts — surface the conflict
- Design would require changes to shared infrastructure — flag for M3/M4 assessment
- Scope is too large for a single planning session — propose decomposition
