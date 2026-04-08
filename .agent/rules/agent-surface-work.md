1. Shared canon (rules, skills, standards, workflows) lives in `.agent/`. Tool-specific directories inherit via symlinks — edit the source, not the symlink.
2. When changing shared content, update ALL tool surfaces that consume it. Run `scripts/symlink_to_agent.sh` after adding/removing shared rules or skills.
3. Parity over duplication: if content applies to multiple tools, it belongs in `.agent/` with symlinks — not duplicated per tool.
4. Tool-specific files (agents, settings, extension CLAUDE.md) only add routing and configuration — they do not define independent policy.
5. Bootstrap files (AGENTS.md, CLAUDE.md) must stay truthful, minimal, and current. They are routing tables, not encyclopedias.
6. Progress workstreams in `.agent/progress/` are live cross-session context. Read relevant ones during bootstrap; update when durable state changes.
