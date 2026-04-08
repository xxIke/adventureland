#!/usr/bin/env bash
set -euo pipefail

# PreToolUse hook for Bash: block destructive commands.
# Exit 0 = allow, Exit 2 = block.
# Reads command from CLAUDE_TOOL_INPUT (JSON with "command" field).

if [[ -z "${CLAUDE_TOOL_INPUT:-}" ]]; then
    exit 0
fi

command_text="$(echo "$CLAUDE_TOOL_INPUT" | grep -oP '"command"\s*:\s*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//' || true)"

if [[ -z "$command_text" ]]; then
    exit 0
fi

# Destructive patterns that should be blocked
destructive_patterns=(
    'rm -rf /'
    'rm -rf /\*'
    'git push --force'
    'git push -f '
    'git reset --hard'
    'git clean -fd'
    'DROP TABLE'
    'DROP DATABASE'
    'mkfs\.'
    'dd if='
    'chmod -R 777'
    '> /dev/sd'
    'format c:'
    ':(){:|:&};:'
)

for pattern in "${destructive_patterns[@]}"; do
    if echo "$command_text" | grep -qiE "$pattern"; then
        echo "BLOCKED: Destructive command detected matching pattern: $pattern"
        echo "Command: $command_text"
        echo "If this is intentional, ask the user to run it manually."
        exit 2
    fi
done

exit 0
