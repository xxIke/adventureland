# Project Documentation Standards

Standards for documentation sizing, structure, and maintainability — optimized for both human and agent consumption.

## Context Window Management

Documentation files are consumed by agents with finite context windows. Size matters.

| Guideline | Threshold |
|-----------|-----------|
| Target per file | 100–200 lines |
| Warning | 250 lines |
| Hard split | 350 lines |

When a file exceeds the warning threshold, evaluate whether it can be split by concern. Use the subdirectory split pattern (index file + detail files) for complex topics.

## Two-Pass Readability

Every document `SHOULD` be useful after reading just the first section. Structure documents so that:

1. **First pass** (first section or summary): Reader understands what, why, and scope
2. **Second pass** (full document): Reader gets complete detail

Front-load decisions and conclusions. Put rationale and detail after.

## Subdirectory Split Pattern

For topics that exceed single-file thresholds:

```
topic/
  _index.md      # Overview, routing, relationships (60-120 lines)
  detail_1.md    # Specific concern (100-180 lines each)
  detail_2.md
```

The index file is the entry point. It provides enough context to decide which detail files to read.

## Format Selection

| Content Type | Format | Rationale |
|-------------|--------|-----------|
| Structured collections | YAML | Machine-parseable, diffable |
| Narrative/explanatory | Markdown | Human-readable, flexible |
| Configuration | YAML/TOML/JSON per ecosystem | Follow community convention |
| API contracts | OpenAPI/JSON Schema | Tooling support |

## Cross-Reference Conventions

- Reference by relative path from repo root: `docs/architecture/README.md`
- Use section anchors for specific sections: `docs/architecture/README.md#decisions`
- Do not duplicate content across files — reference the canonical source
