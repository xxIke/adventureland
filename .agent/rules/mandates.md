# Mandates

Enduring constraints governing all work in this repository. These are steady-state conventions, not milestone-scoped. Mandates use RFC 2119 normative language (see `standards/normative_language.md`).

## M1: Documentation-First Implementation

All implementation starts from documented requirements and design contracts.

**Documentation chain:** requirements -> architecture/design -> contracts -> implementation -> contract-based testing. Each link `MUST` be documented before the next begins.

- Existing implementations are reference for what was attempted, not a baseline to preserve
- Design contracts from requirements, then implement to those contracts
- Planning artifacts and session transcripts are input to documentation — they are not documentation themselves

## M2: Contracts Before Compatibility

Until a stable baseline is established, the goal is correct implementation that satisfies requirements — not backwards compatibility with prior state.

- Breaking changes to structure, APIs, or contracts are acceptable pre-baseline
- Post-baseline: compatibility expectations apply; breaking changes require documented rationale

## M3: Core Before Dependent Work

Shared infrastructure takes priority over dependent implementation. If there is a known problem in a shared component, fix it before the things that depend on it.

- Shared libraries, CI, and tooling `MUST` be resolved before dependent work proceeds
- Known core defects block dependent implementation — fix upstream first

## M4: Centralize Shared Solutions

If a solution is not specific to a single component's unique concern, it belongs in shared resources.

Indicators a solution should be centralized:
- Another component has the same need (existing or anticipated)
- The solution sets up environmental constraints or configuration
- The solution is orthogonal to the component's core domain logic

When encountering a need that fits these indicators, check for existing shared solutions before implementing per-component, and flag cross-component patterns for centralization.

## M5: Test Contracts, Not Internal Behavior

**Prerequisite:** Contract-based testing requires documented contracts. If contracts do not yet exist, documenting them is a blocking prerequisite.

- Tests `MUST` verify input/output/interaction contracts remain valid — not that internal behavior is unchanged
- Tests interact only with public interfaces
- Assert on observable outputs given known inputs
- Tests `MUST` survive refactoring — if the contract holds, the test passes
- Mock only at trust boundaries (external services, filesystem, network)
- If a test needs internal access, the contract is underspecified — fix the contract first

## M6: Update All Affected Surfaces

When any change is made, update all affected surfaces. Do not let documentation, agent files, or configurations drift from reality.

- Every implemented component `MUST` have updated documentation defining its contracts
- This includes: `.agent/`, `.claude/`, `.codex/`, root adapters, documentation indexes, READMEs

## M7: Progress Workstreams Are Required

Active cross-session work `MUST` use `.agent/progress/*.json` as the shared execution whiteboard.

- Agents `MUST` read relevant live progress during non-trivial bootstrap
- Agents `MUST` update progress when durable state, priorities, blockers, or next actions change
- Retired workstreams `MUST` be removed once their conclusions live elsewhere

## M8: Maintain Agent Surface Parity

Every change `MUST` be propagated to all affected tool surfaces in the same operation.

- When shared content in `.agent/` changes, verify all tool directories that symlink to it remain correct
- When any root adapter (`AGENTS.md`, `CLAUDE.md`) changes, update the other to maintain alignment
- When adding, removing, or modifying shared rules/skills, update every tool surface that consumes them
- A change that updates one tool surface without updating others is an M8 violation

## M9: Improve Agent Surface Clarity

Agents `MUST` improve the clarity and completeness of the agent surface when gaps, ambiguity, or misleading instructions are discovered.

- Bootstrap instructions `MUST` stay truthful, minimal, and current
- When new context categories are needed, place them in an explicit canonical location
- Remove or correct stale routing, bootstrap, or canonical-source claims

## M10: Continuous Agentic Improvement

The agent surface itself is a living engineering artifact subject to continuous quality improvement.

- When agentic output (implementations, reviews, documentation) critically underperforms or fails to produce desired results, the corrective action `MUST` target the agentic surface (skills, agents, rules, workflows, standards) — not just the output
- After correcting the agentic surface, remediate output if salvageable; regenerate if not
- Agents `SHOULD` flag patterns of repeated failure or drift for surface-level correction
- Periodic review of agentic output quality against expectations is a first-class maintenance activity
- The quality bar for the agent surface is: would a competent engineer, new to this project, produce correct output by following these instructions?
