# Testing Standards

Testing postures and strategies for iterative, contract-based development. Extends `core.md` testing section.

## Testing Postures

Different development phases call for different testing strategies. Select the posture that matches your current phase.

### Posture 1: Contract Scaffolding (Pre-Implementation)

**When:** Contracts are documented but implementation hasn't started.

- Write contract-level test skeletons that define expected inputs, outputs, and error conditions
- Tests `SHOULD` be runnable and failing (red) — they define the target
- Focus on public API surface, not internals
- Each contract clause maps to at least one test case

### Posture 2: Implementation Iteration (Active Development)

**When:** Actively implementing against documented contracts.

- Run tests frequently — every meaningful change should be validated
- Fix failing contract tests before adding new functionality
- Add regression tests for each bug discovered during development
- `MUST NOT` weaken contract tests to make implementation easier — if a test seems wrong, re-examine the contract
- Integration tests at component boundaries validate wiring

### Posture 3: Stabilization (Pre-Baseline)

**When:** Implementation is feature-complete, preparing for baseline lock.

- Full test suite `MUST` pass
- Add edge case and negative-path tests for critical contracts
- Performance/load testing for components with throughput requirements
- Contract coverage audit: every documented contract has at least one test

### Posture 4: Maintenance (Post-Baseline)

**When:** Component is baselined; changes are incremental.

- Every change `MUST` include tests that would have caught the issue
- Regression tests for every bug fix
- Backward compatibility tests for public API changes
- `MUST NOT` break existing contract tests without documented rationale

## Contract-Based Testing Principles (M5)

These principles apply across all postures:

1. **Public interface only.** Tests interact through the same interfaces consumers use. Never import internal modules, access private state, or use test-only backdoors.

2. **Observable outputs.** Assert on what the system produces (return values, side effects, state changes visible through public API) — not how it produces it.

3. **Refactoring-resilient.** If the contract holds, the test passes. Internal restructuring `MUST NOT` break tests.

4. **Mock at trust boundaries only.** External services, filesystem, network, time — these are legitimate mock points. Internal collaborators within the same component are not.

5. **Error paths are contracts too.** Document and test error conditions, not just happy paths. What errors does the component raise? What inputs are rejected? What happens on timeout?

6. **Contract gaps surface as test gaps.** If you cannot write a test without reaching into internals, the contract is underspecified. Fix the contract documentation first, then write the test.

## Test Organization

- **Unit tests:** Single component, mocked external dependencies, fast execution
- **Integration tests:** Multiple components wired together, real dependencies where practical
- **Contract tests:** Verify that documented API contracts hold (can be unit or integration)
- **Regression tests:** Reproduce specific bugs, prevent recurrence

## Anti-Patterns

- Testing internal method calls or invocation counts (couples tests to implementation)
- Copy-pasting test setup across many tests instead of using fixtures/factories
- Tests that pass when the feature is broken (false positives)
- Tests that fail on unrelated changes (false negatives / fragile tests)
- Mocking the system under test (testing the mock, not the code)
