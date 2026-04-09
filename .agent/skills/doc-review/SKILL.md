---
name: doc-review
description: Review component documentation for completeness, consistency, intent capture, and implementability. Supports interactive mode (stops with questions on ambiguity) and autonomous mode (documents assumptions, proceeds). Use when assessing documentation quality before implementation.
---

## Overview

Systematic review of component documentation against the M1 documentation chain and engineering standards. Ensures documentation is sufficient to drive correct implementation.

## Use When

- Before starting implementation of a component (M1 gate)
- After significant documentation changes
- User asks to review, audit, or validate documentation
- Uncertainty about whether documentation is implementation-ready

## Don't Use When

- Reviewing implementation code (use implementation-review)
- Writing new documentation from scratch (just write it)
- Reviewing agentic surface files (use surface-hygiene)

## Modes

**Interactive (default):** Stop and ask the user when ambiguity is found. Better for initial reviews and intent capture.

**Autonomous:** Document assumptions and proceed. Better for batch reviews and CI-like checks.

## Steps

1. **Identify documentation scope.** What component? Where are its docs?

2. **Verify M1 chain completeness.** Check each link exists:
   - [ ] Requirements document
   - [ ] Architecture/design document
   - [ ] Contract definitions (API contracts, interface contracts, behavior contracts)

3. **Requirements review.** For each requirement:
   - Is it specific enough to implement against?
   - Is it testable?
   - Are there contradictions with other requirements?
   - Are edge cases and error conditions addressed?

4. **Design review.** For the architecture/design:
   - Does it address all requirements?
   - Are component boundaries clear?
   - Are dependencies explicit?
   - Are tradeoffs documented with rationale?

5. **Contract review.** For each contract:
   - Is the input/output specification complete?
   - Are error conditions defined?
   - Are preconditions and postconditions stated?
   - Could a developer implement this without additional context?

6. **Consistency check.** Cross-reference:
   - Do contracts match requirements?
   - Does design address all requirements?
   - Are naming conventions consistent?
   - Do contract Context Dependencies match `docs/architecture/context-map.md`?
   - Do cross-references resolve correctly?

7. **Implementability assessment.** Could a competent engineer implement solely from these docs?
   - Flag sections requiring domain knowledge not present in docs
   - Flag implicit assumptions that should be explicit
   - Flag missing error handling specifications

8. **Staleness check.** Is the documentation current?
   - Do referenced files/paths exist?
   - Do referenced APIs/interfaces match implementation (if any)?
   - Do contracts reference retired systems or deprecated ctx slots? (Check `docs/contracts/_index.md` retired contracts section)

9. **Produce findings.** Classify each finding:
   - **Blocker:** Must fix before implementation can proceed
   - **Warning:** Should fix but not blocking
   - **Suggestion:** Could improve clarity or completeness

10. **Report.** Structured output with findings, recommendations, and overall assessment of implementation-readiness.

## Quality Gate

Documentation passes review when:
- No blocker findings remain
- Every requirement has a corresponding contract
- Contracts are specific enough for contract-based testing (M5)
- A competent engineer could implement from the docs alone
