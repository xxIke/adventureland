# Codex Extension

Codex-specific extension to root bootstrap. Read root `AGENTS.md` first.

## Codex Routing

- Config defaults: `.codex/config.toml`
- Exec approval rules: `.codex/rules/*.rules`
- Rules: `.codex/rules/` (symlinked from `.agent/rules/`)
- Skills: `.codex/skills/` (symlinked from `.agent/skills/`)

## Expectations

- Follow root bootstrap order — this file is secondary
- Shared rules and skills in `.codex/` are symlinks — edit canonical source in `.agent/`
- Codex exec-policy files in `.codex/rules/*.rules` are local tool config, not symlinks
- Run `scripts/symlink_to_agent.sh` after changes to shared rules/skills

## Codex-Specific Notes

- Codex lacks lifecycle hooks — instruction-based enforcement in AGENTS.md compensates
- Path-scoped rule activation differs from Claude Code — rules without `globs:` frontmatter load at launch; rules with `globs:` may not activate reliably in Codex
- When instruction enforcement is critical, prefer always-loaded rules over path-scoped rules
- Treat `.codex/config.toml` and `.codex/rules/*.rules` as controlled surfaces; only edit them when explicitly requested
