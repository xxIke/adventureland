---
name: implementation-review
description: Review implementation against documented contracts. Verifies contract conformance, design quality, test quality, and documentation currency. Use when assessing whether implementation correctly satisfies its contracts.
---

## Overview

Independent review of implementation against its documented contracts. Focuses on contract fidelity, not code style preferences.

## Use When

- After implementation of a component or phase is complete
- Before marking a progress workstream item as passing
- User asks to review, audit, or validate implementation
- As part of the implement-review-fix cycle

## Don't Use When

- Reviewing documentation (use doc-review)
- Starting new implementation (use implement)
- Reviewing agentic surface (use surface-hygiene)

## Steps

1. **Load contracts.** Read the component's documented contracts (requirements, design, API contracts, behavior contracts).

2. **Inventory implementation.** Map what exists in the implementation against what contracts require.

3. **Contract conformance.** For each documented contract:
   - Is it implemented?
   - Does the implementation match the contract specification?
   - Are error conditions handled as documented?
   - Are preconditions validated?

4. **Coverage gaps.** Identify:
   - Contracts without implementation (missing features)
   - Implementation without contracts (undocumented behavior — potential drift)
   - Partial implementations (stubs, TODOs, NotImplementedError)

5. **Design quality.** Assess against `standards/core.md`:
   - Single responsibility per module/function?
   - Side effects explicit at boundaries?
   - No hidden global state?
   - No premature abstractions?

6. **Test quality.** Assess against `standards/testing.md` and M5:
   - Do tests exercise public interfaces only?
   - Do tests assert on observable outputs?
   - Would tests survive refactoring?
   - Are error paths tested?
   - Are mocks only at trust boundaries?

7. **Security review.** Check against core standards:
   - External input validated at trust boundaries?
   - No committed secrets?
   - Least privilege applied?
   - OWASP Top 10 relevant mitigations in place?

8. **Documentation currency (M6).** Verify:
   - Component docs match current implementation
   - README/setup instructions are accurate
   - API documentation reflects actual behavior

9. **Classify findings.**
   - **Blocker:** Contract violation, security issue, or missing critical feature
   - **Warning:** Quality concern, incomplete test coverage, documentation drift
   - **Suggestion:** Could improve but not blocking

10. **Report.** Structured findings with evidence (file:line references), classification, and recommended actions.

## Assumption Boundary — STOP If

- No documented contracts exist (M1 — cannot review without contracts)
- Implementation appears to be in-progress with known incomplete state (check progress workstream)
- Scope of review is unclear — ask the user
