# Implementation Workflow

Generic workflow for implementing a component against documented contracts. Implements the M1 chain: requirements -> design -> contracts -> implementation -> contract-based testing.

## Prerequisites

Before starting implementation:
- [ ] Requirements documented
- [ ] Architecture/design documented
- [ ] Contracts documented
- [ ] Shared dependencies in good state (M3)
- [ ] Progress workstream created or identified (M7)

If any prerequisite is missing, use the `spec-plan` skill first.

## Workflow

### Phase 1: Pre-Flight

1. Read component documentation (requirements, design, contracts)
2. Read relevant `.agent/progress/*.json` for current state
3. Check M3 — are shared dependencies healthy?
4. Identify which implementation phase to work on next
5. Check for existing shared solutions (M4)

### Phase 2: Implement

1. Implement against documented contracts — not what seems easiest
2. Every contract clause gets an implementation
3. No stubs, TODOs, or placeholder implementations
4. Side effects explicit at boundaries
5. Security contracts implemented (input validation, least privilege, no secrets)
6. Feature is actually reachable (called/registered/wired from somewhere)

### Phase 3: Test

Select testing posture from `standards/testing.md` based on current phase:
1. Write/update contract-based tests (M5)
2. Tests use public interfaces only
3. Assert on observable outputs
4. Test error paths, not just happy paths
5. Mock only at trust boundaries
6. Run full test suite — all tests must pass

### Phase 4: Review

1. Self-review against contracts — does implementation match?
2. Check for coverage gaps (contracts without tests, implementation without contracts)
3. Check for stub detection (`pass`, `NotImplementedError`, `TODO`, `FIXME`)
4. Security review against core standards
5. If available, dispatch independent review (implementation-review skill)

### Phase 5: Fix (If Needed)

1. Address review findings by severity (blockers first)
2. Re-run tests after fixes
3. Maximum 2 fix cycles — if findings persist, escalate to user
4. Do not weaken contracts or tests to resolve findings

### Phase 6: Close

1. Update `.agent/progress/*.json` workstream
2. Update component documentation if contracts or behavior changed (M6)
3. Verify agent surface parity if any shared content changed (M8)
4. Mark progress item as `passing` with evidence (test results, artifacts)

## Iteration Pattern

For multi-phase implementation, repeat Phases 2-6 for each phase. Each phase should be independently testable and reviewable.

## Assumption Boundary — Escalate If

- Contract seems impractical to implement — discuss with user before deviating
- Design-level problem discovered during implementation — needs design revision, not code workaround
- Findings persist after 2 fix cycles — user decision needed
- Shared dependency defect discovered — M3 requires fixing upstream first
