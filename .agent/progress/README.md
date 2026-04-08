# Progress Workstreams

Live execution whiteboard for cross-session work (M7). Each `.json` file in this directory tracks one active workstream.

## Schema

```json
{
  "workstream": "short_slug",
  "title": "Human-readable title",
  "status": "active | blocked | completed | parked",
  "objective": "What the workstream accomplishes",
  "scope": "What is included",
  "why_now": "Why this matters relative to bigger picture",
  "current_focus": ["Short current priority"],
  "related_context": ["path/or/context"],
  "recent_updates": [
    {
      "date": "YYYY-MM-DD",
      "summary": "Short durable update",
      "artifacts": ["path/to/artifact"],
      "next": ["Concrete follow-up"]
    }
  ],
  "items": {
    "item_slug": {
      "description": "Discrete work item",
      "status": "failing | in_progress | passing | blocked",
      "priority": "high | medium | low",
      "blocked_by": [],
      "correlates": [],
      "last_touched": "YYYY-MM-DD",
      "next_action": "Single most useful next move",
      "evidence": [],
      "notes": "Concise durable context"
    }
  }
}
```

## Status Values

| Workstream Status | Meaning |
|-------------------|---------|
| `active` | Work is ongoing |
| `blocked` | Cannot proceed; `blocked_by` explains why |
| `completed` | Objective achieved; ready for retirement |
| `parked` | Intentionally paused; will resume later |

| Item Status | Meaning |
|-------------|---------|
| `failing` | Not yet meeting criteria |
| `in_progress` | Actively being worked |
| `passing` | Verified complete with evidence |
| `blocked` | Waiting on dependency |

## Rules

1. Never mark an item `passing` without evidence (test results, artifacts, documentation paths).
2. Update `recent_updates` when durable state changes — not for ephemeral work.
3. Keep `next_action` on every non-passing item. Future sessions use this for routing.
4. Retire completed workstreams by removing the file once conclusions are absorbed into durable artifacts (documentation, implementation, standards).
5. Focus entries on what future sessions need to know, not session diary entries.

## Session Lifecycle

### Session Start Checklist

Before beginning substantive work:

1. Read `mandates.md` (unless Tier 0 task per context loading policy)
2. List active progress workstreams: `ls .agent/progress/*.json`
3. Read relevant workstreams for the task at hand
4. Check `current_focus` and `next_action` fields for orientation
5. Verify no blockers exist that would prevent productive work
6. If the task matches a workflow or skill, load it

Do NOT read all workstreams. Read only those relevant to the assigned task.

### Mid-Session Checkpointing

Update progress workstreams when durable state changes — not for ephemeral work.

**When to checkpoint:**
- A progress item status changes (failing -> in_progress, in_progress -> passing)
- A blocker is discovered or resolved
- A significant artifact is produced (new file, passing test suite, completed review)
- Scope or priority shifts based on new information

**When NOT to checkpoint:**
- After each individual file edit (too granular)
- When exploring or reading code (no durable change)
- When the update would just say "still working on it"

**What to update:**
- `items[slug].status` — reflect the actual state
- `items[slug].next_action` — what the next session needs to know
- `items[slug].evidence` — paths to artifacts that prove status
- `recent_updates` — add an entry only for significant changes

### Session End Procedures

Before ending a session with substantive work:

1. Update relevant progress workstreams with durable changes
2. Ensure `next_action` is set on all non-passing items you touched
3. If documentation was affected, verify M6 compliance
4. If shared content changed, verify M8 parity
5. Consider whether any agentic surface improvements are needed (M10)

### Integration with Hooks

The Stop hook in `.claude/settings.json` (if configured) prints session-end reminders corresponding to the procedures above. The hook is informational — it does not block session end.

If hooks are not configured (e.g., Codex), agents `SHOULD` self-check these procedures before ending.
