# CLAUDE.md — Claude Code Extension

Claude-specific extension to root bootstrap. Read root `CLAUDE.md` first. This file adds Claude routing only.

## Claude Routing

- Settings and permissions: `.claude/settings.json`
- Path-scoped rules: `.claude/rules/` (symlinked from `.agent/rules/`)
- Sub-agents: `.claude/agents/`
- Skills: `.claude/skills/` (symlinked from `.agent/skills/`)

## Expectations

- Follow root bootstrap order — this file is secondary
- Shared rules and skills in `.claude/` are symlinks — edit canonical source in `.agent/`
- Load `.agent/context/` files as directed by root bootstrap
- Run `scripts/symlink_to_agent.sh` after changes to shared rules/skills
