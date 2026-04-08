# Core Engineering Standards

Universal software engineering quality standards. Apply to all languages, platforms, and components. Uses RFC 2119 normative language (see `normative_language.md`).

## Design and Architecture

- `MUST` keep a single source of truth for domain state and configuration ownership.
- `MUST` prefer high cohesion within modules and low coupling across module boundaries.
- `MUST` make side effects explicit at boundaries (I/O, network, filesystem, time, randomness).
- `SHOULD` design for reversibility: changes should be easy to roll back or isolate.
- `SHOULD` preserve backward compatibility for public interfaces unless explicitly approved.
- `MUST NOT` introduce abstractions before there is demonstrated need.

## Correctness and Reliability

- `MUST` validate external inputs at trust boundaries.
- `MUST` handle failure paths explicitly (timeouts, retries, partial failures, not-found).
- `MUST` avoid hidden global state when it affects correctness or test determinism.
- `SHOULD` define invariants in code or tests for critical behavior.
- `SHOULD` use idempotent operations where retries are likely.

## Maintainability and Clarity

- `MUST` choose clear names that reflect intent, not implementation trivia.
- `MUST` keep functions/modules focused; split units with multiple responsibilities.
- `SHOULD` optimize for readability and changeability over cleverness.
- `SHOULD` keep diffs minimal and scoped to the requested behavior.
- `SHOULD` avoid premature optimization — measure first.

## Security and Privacy

- `MUST NOT` commit secrets, tokens, private keys, or sensitive production data.
- `MUST` treat all external input as untrusted.
- `MUST` apply least privilege for auth, access, and credential use.
- `SHOULD` avoid logging sensitive fields; redact when logging is necessary.
- `SHOULD` follow OWASP Top 10 mitigations for web-facing components.

## Testing and Verification

- `MUST` add or update tests for behavior changes unless explicitly waived.
- `MUST` test the affected surface area, not only helper functions.
- `MUST` test input/output/interaction contracts, not internal implementation behavior (M5).
- `SHOULD` include one regression test for each bug fix.
- `SHOULD` keep tests deterministic and isolated.
- See `testing.md` for testing postures and strategies.

## Documentation and Traceability

- `MUST` update docs when behavior, contracts, or operations change (M6).
- `MUST` ensure every implemented component has documentation defining its contracts.
- `SHOULD` document why a non-obvious approach was chosen.
- `SHOULD` record meaningful deviations/tradeoffs in component documentation.

## Tool Usage

- `MUST` prefer dedicated tools over shell equivalents when available (e.g., Glob over `find`, Grep over `grep`, Read over `cat`, Edit over `sed`).
- `MUST` reserve shell execution for operations that require it (git, build commands, platform-specific tooling).
