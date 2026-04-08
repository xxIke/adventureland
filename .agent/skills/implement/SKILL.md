---
name: implement
description: Initiate implementation work for a component. Resolves context, identifies the next actionable phase, checks prerequisites, and dispatches implementation with full context. Use when starting or resuming implementation of any component.
---

## Overview

Entry point for implementation work. Ensures M1 (documentation-first) and M3 (core before dependent) prerequisites are met before dispatching actual implementation.

## Use When

- Starting implementation of a new component or phase
- Resuming implementation after a pause
- User says "implement", "build", "code", or names a specific component to work on

## Don't Use When

- Writing documentation or requirements (use doc-review instead)
- Reviewing existing implementation (use implementation-review instead)
- Planning architecture or design (do that before invoking this)

## Steps

1. **Identify component and scope.** Determine what component the user wants implemented and what phase of work applies.

2. **Check M1 prerequisites.** Verify the documentation chain exists:
   - Requirements documented?
   - Architecture/design documented?
   - Contracts documented?
   - If any link is missing, stop and document it first.

3. **Check M3 prerequisites.** Verify shared dependencies are in good state:
   - Are there known defects in shared infrastructure this component depends on?
   - If yes, those must be fixed first.

4. **Load progress context.** Read relevant `.agent/progress/*.json` to understand current state, blockers, and recent updates.

5. **Identify next phase.** Based on progress state and documentation, determine the next actionable implementation phase.

6. **Check for existing shared solutions (M4).** Before implementing, verify no shared solution already exists for the need.

7. **Dispatch implementation.** Execute implementation against documented contracts:
   - Implement what the spec says, not what seems easiest
   - Every contract gets an implementation
   - No stubs or placeholder implementations
   - Verify the feature is actually reachable (called from somewhere)

8. **Update progress and documentation.** After implementation:
   - Update `.agent/progress/` workstream
   - Update component documentation if contracts or behavior changed (M6)
   - Verify agent surface parity (M8)

## Assumption Boundary — STOP If

- No documented requirements or contracts exist (M1 blocker)
- Shared dependency has known defects (M3 blocker)
- Scope is unclear or ambiguous — ask the user
- Implementation would require breaking a documented contract without approval
