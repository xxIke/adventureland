# Boundaries

Ownership guardrails for AdventureLand bot.

## Ownership Model

| Layer | Owner | Location |
|-------|-------|----------|
| Control plane | This repo (root) | `.agent/`, `.claude/`, `.codex/`, root adapters |
| Project docs | This repo | `docs/` |
| Bot source | This repo | `src/` |

Extend this table as project components are established.

## Guardrails

### Control Plane
- `MUST` define shared policy in `.agent/`
- `MUST` define tool-specific configuration in respective tool directories
- `MUST NOT` duplicate shared policy across tool directories — use symlinks

### Components
- `MUST` keep component-specific docs in the component's canonical docs location
- `MUST` follow the documentation chain (M1) before implementation
- Component documentation is canonical for that component's domain

### Cross-Boundary Rules
- Control-plane workflows may reference component paths (read-only)
- Shared solutions that apply across components belong in the control plane (M4)
- Component changes must be verified against control-plane standards
