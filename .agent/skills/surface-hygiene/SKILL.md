---
name: surface-hygiene
description: Verify cross-tool parity, symlink integrity, progress inventory accuracy, and stale references across the agent surface. Use when checking agentic infrastructure health or after surface modifications.
---

## Overview

Audit the agentic work surface for drift, staleness, and parity violations. Ensures M8 (parity) and M9 (clarity) mandates are satisfied.

## Use When

- After modifying `.agent/`, `.claude/`, `.codex/`, or root adapters
- Periodic maintenance check
- User asks to verify agent surface health
- Before or after adding new rules, skills, or agents

## Don't Use When

- Reviewing component documentation (use doc-review)
- Reviewing component implementation (use implementation-review)

## Steps

1. **Symlink integrity.** For each tool directory (`.claude/`, `.codex/`):
   - Verify all symlinks in `rules/` and `skills/` resolve to valid targets in `.agent/`
   - Identify broken symlinks (target removed from `.agent/`)
   - Identify missing symlinks (new items in `.agent/` not linked)

2. **Cross-tool parity (M8).** Compare:
   - `.claude/rules/` vs `.codex/rules/` — same set of symlinks?
   - `.claude/skills/` vs `.codex/skills/` — same set of symlinks?
   - `AGENTS.md` vs `CLAUDE.md` — aligned content?

3. **Progress inventory.** For each `.agent/progress/*.json`:
   - Does the file parse as valid JSON?
   - Does it follow the documented schema?
   - Are there completed workstreams that should be retired?
   - Are item statuses current?

4. **Bootstrap reference check.** In `AGENTS.md` and `CLAUDE.md`:
   - Do referenced paths exist?
   - Is the canonical sources table current? (Must include: game-api.md, context-map.md, game-reference.md, review findings)
   - Is the bootstrap read order current?

5. **Rule and skill references.** For each rule and skill:
   - Does it reference files or paths that exist?
   - Are mandate references (M1, M2, etc.) valid?
   - Is the description accurate for current functionality?

6. **Canonical source verification.** In `.agent/policies/canonical_sources.md`:
   - Does the domain ownership table match reality?
   - Are non-canonical source designations still accurate?

7. **Stale content detection.** Flag:
   - Files referencing removed or renamed paths
   - Directives that appear completed but not pruned
   - Progress workstreams with no updates in >30 days
   - Contracts referencing retired systems (check `docs/contracts/_index.md` retired section)
   - References to deprecated ctx slots (e.g., `ctx.combat`)

8. **Settings review.** In `.claude/settings.json`:
   - Are permission patterns still appropriate?
   - Do denied patterns match current security needs?

9. **Report.** Structured findings:
   - **Fix required:** Broken symlinks, parity violations, stale references
   - **Attention:** Potentially outdated content, retirement candidates
   - **Healthy:** Verified-good items
