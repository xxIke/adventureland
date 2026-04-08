# Context Loading Policy

Policy for managing context budget when loading bootstrap and task-specific files.

## Principle

Load the minimum context needed to do the task correctly. Overloading context wastes budget and can degrade output quality — research shows models underuse information placed in the middle of large contexts ("lost-in-the-middle" effect). Underloading risks mandate violations and quality drift.

The goal is not "load everything" but "load the right things."

## Loading Tiers

### Tier 0: Trivial Tasks

**When:** Task is self-contained, requires no project knowledge.
**Examples:** Typo fixes, formatting corrections, single-line changes with explicit instructions.
**Load:** Nothing. The task description is sufficient.

### Tier 1: Scoped Tasks (~2-3 files)

**When:** Task is within a single component and scope is clear.
**Examples:** Bug fix in a known file, adding a test for an existing function, updating a specific doc.

**Load:**
- Mandates auto-load via `rules/mandates.md` — no manual load needed
- Relevant progress workstream (if one exists for this component)
- Component-specific documentation

**Skip:** Directives, full standards, workflows, unrelated progress workstreams.

### Tier 2: Standard Tasks (~4-6 files)

**When:** Task involves implementation, review, or cross-component work.
**Examples:** Implementing a new feature, reviewing a component, refactoring shared code.

**Load:**
- Full bootstrap read order from AGENTS.md/CLAUDE.md
- Relevant skill or workflow
- Component documentation
- Relevant language standard

**Skip:** Unrelated progress workstreams, language standards for other languages, all policies.

### Tier 3: Surface Work (~6-10 files)

**When:** Task modifies the agentic surface itself.
**Examples:** Adding rules/skills, updating mandates, modifying bootstrap files, surface hygiene audit.

**Load:**
- Full bootstrap read order
- All relevant policies (canonical_sources, boundaries, this file)
- Surface-hygiene skill
- All root adapters and tool-specific extensions
- All affected rules and skills

## Progressive Disclosure

Within each tier:
1. Read the routing file first (README, index, or table of contents)
2. Read only the files the routing file directs you to for this task
3. If a loaded file references another file as essential, load that too
4. Stop when you have enough context to proceed correctly

## Budget Awareness

- Each loaded file costs context budget that could be used for task work
- Files over 200 lines cost disproportionately — check if a specific section suffices
- Progress workstream JSON files are compact by design — prefer these for state recovery
- Standards files are dense — load the relevant language standard, not all of them

## Anti-Patterns

- Loading all progress workstreams when only one is relevant
- Loading all language standards when working in one language
- Re-reading mandates and standards already loaded in this session
- Loading full component documentation when only the API contract is needed
- Loading context "just in case" — if you are not sure you need it, you probably do not
- Passing raw document dumps instead of extracting relevant sections
