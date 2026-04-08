# Definition of Done

Checklist for completing any implementation work. All applicable items must be satisfied.

## Mandate Compliance

- [ ] M1: Documentation chain exists (requirements -> design -> contracts -> implementation -> tests)
- [ ] M3: No known shared infrastructure defects blocking this work
- [ ] M4: Shared solutions used where applicable; no unnecessary per-component duplication
- [ ] M5: Tests verify contracts, not internal behavior; contracts documented before tests written
- [ ] M6: All affected documentation, adapters, and configurations updated
- [ ] M7: Progress workstream updated with current state
- [ ] M8: All tool surfaces updated if shared content changed
- [ ] M10: Any agentic surface gaps discovered during work have been addressed

## Code Quality

- [ ] Implementation matches documented contracts
- [ ] No stubs, TODOs, or placeholder implementations in delivered code
- [ ] Side effects explicit at boundaries
- [ ] External input validated at trust boundaries
- [ ] No committed secrets, tokens, or credentials
- [ ] Feature is reachable (called/registered/wired from somewhere)

## Testing

- [ ] Contract-based tests exist for all documented contracts
- [ ] Tests use public interfaces only (M5)
- [ ] Error paths tested, not just happy paths
- [ ] All tests pass
- [ ] Regression test added for each bug fix

## Documentation

- [ ] Component documentation matches implementation
- [ ] API/contract documentation reflects actual behavior
- [ ] README/setup instructions accurate if changed
- [ ] Non-obvious decisions documented with rationale

## Progress

- [ ] Progress workstream item marked with appropriate status
- [ ] Evidence recorded (test results, artifacts, file paths)
- [ ] Next actions clear for follow-on work
