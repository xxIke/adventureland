# AdventureLand Bot Documentation

Browser-native bot system for [Adventure Land](https://adventure.land), a code MMORPG where players write JavaScript to control characters. This bot automates a party of hunters and a merchant, coordinating farming, supply, and progression.

## Documentation Layers

| Layer | Path | What it captures |
|-------|------|-----------------|
| **Requirements** | `requirements/` | Architecture-independent intent — what the bot must do and why. Survives re-architecture. |
| **Architecture** | `architecture/` | Confirmed design decisions — system boundaries, composition model, infrastructure, data flow. |
| **Game API** | `game-api.md` | Game function semantics, cooldown groups, entity properties. Shared reference for all contracts. |
| **Contracts** | `contracts/` | Implementable interfaces — method signatures, event payloads, behavior invariants. |
| **Roadmap** | `roadmap/` | Implementation phases — scope, dependencies, acceptance criteria per phase. |
| **Review** | `review/` | Audit findings and remediation tracking. |

## Reading Order

1. **Requirements** — understand what the bot needs to accomplish
2. **Architecture** — understand how the system is structured and why
3. **Contracts** — understand the stable interfaces between components
4. **Roadmap** — understand what gets built when

## M1 Documentation Chain

Per [M1: Documentation-First Implementation](../.agent/rules/mandates.md), the implementation chain is:

```
requirements → architecture/design → contracts → implementation → contract-based testing
```

Each layer in this directory maps to a link in that chain. Requirements and architecture are authored first. Contracts are authored per-component before implementation begins. Implementation and testing follow from contracts.

## Standards

All documentation follows [project documentation standards](../.agent/standards/project_documentation.md):
- 100-200 line target per file, 250 warning, 350 hard split
- Two-pass readability (first section stands alone)
- Cross-reference by relative path, no content duplication
