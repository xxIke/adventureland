---
name: output-review
description: Systematically review agentic output quality, identify surface deficiencies causing underperformance, and produce actionable correction recommendations. Implements M10 (Continuous Agentic Improvement). Use after significant agentic output or when patterns of underperformance are observed.
---

## Overview

Grade agentic output against task intent, map failures to agentic surface deficiencies, and recommend corrections. The goal is to improve the surface so that future output is better — not just fix the current output.

## Use When

- After significant agentic output that underperformed expectations
- When patterns of repeated failure or drift are observed across sessions
- Periodic quality assessment of agentic surface effectiveness
- User asks to review agent performance or output quality

## Don't Use When

- Reviewing human-authored documentation (use doc-review)
- Reviewing implementation code against contracts (use implementation-review)
- Checking surface parity and symlinks (use surface-hygiene)
- Output met expectations — don't fix what isn't broken

## Steps

### 1. Capture Output and Context

- What was the task intent? What was requested?
- What was the actual output produced?
- What contracts, standards, or expectations apply?
- What skill, agent, or workflow was used?
- What context was loaded at the time?

### 2. Grade Output Against Intent

Assess on four dimensions:

| Dimension | Question |
|-----------|----------|
| **Completeness** | Did it address all parts of the task? |
| **Correctness** | Does it satisfy documented contracts and standards? |
| **Quality** | Does it meet engineering quality expectations? |
| **Mandate compliance** | Were mandates (M1-M10) followed? |

Classify overall: **Acceptable** / **Needs Remediation** / **Needs Regeneration**

### 3. Identify Failure Patterns

- Is this an isolated failure or part of a recurring pattern?
- Has similar output from previous sessions shown the same weakness?
- Categorize each failure:
  - **Omission** — something was left out
  - **Misinterpretation** — task was understood wrong
  - **Quality degradation** — output was produced but below standard
  - **Scope drift** — output wandered beyond the task
  - **Mandate violation** — a specific mandate was not followed

### 4. Root Cause: Trace to Surface

Map each identified failure to a specific agentic surface deficiency:

| Surface Element | Possible Deficiency |
|-----------------|-------------------|
| Skill instructions | Vague steps, missing steps, wrong scope boundaries |
| Path-scoped rules | Missing rule for this context, rule too broad/narrow |
| Standards | Gap in coverage, ambiguous requirement |
| Context/directives | Missing context, stale directive, wrong loading tier |
| Agent instructions | Inadequate constraints, wrong tool access, missing mandatory reads |
| Workflows | Missing phase, unclear handoff, insufficient verification |
| Checklists | Missing checklist item, item too vague to verify |

If no surface deficiency explains the failure, it may be a model capability limitation — document this separately.

### 5. Determine Remediation Strategy

For each failure, decide:

- **Remediate in place:** The output can be fixed without regenerating. Surface deficiency is minor or the output is mostly correct.
- **Regenerate from improved surface:** The surface deficiency would cause the same failure again. Fix the surface first (M10), then regenerate.

Decision criteria: if running the same task again with the same surface would produce the same failure, the surface must be fixed first.

### 6. Produce Correction Recommendations

For each surface deficiency found:

- **File to modify:** Specific path (e.g., `.agent/skills/implement/SKILL.md`)
- **What to change:** Draft the correction (new rule text, skill step, standard clause, checklist item)
- **Priority:** Blocking (must fix before next use) vs Improvement (would help but not critical)

### 7. Report

Structured output:

```
## Output Review: [Task/Component]

### Grade: [Acceptable | Needs Remediation | Needs Regeneration]

### Failure Patterns
- [Pattern]: [category] — [brief description]

### Surface Deficiencies
| Deficiency | Surface Element | File | Priority |
|------------|-----------------|------|----------|
| [description] | [element type] | [path] | [blocking/improvement] |

### Correction Recommendations
1. [File]: [specific change]

### Remediation Decision
[Remediate in place / Regenerate from improved surface / Acceptable as-is]
```
