#!/usr/bin/env bash
set -euo pipefail

# PreToolUse hook for Write: block writes to sensitive paths.
# Exit 0 = allow, Exit 1 = warn, Exit 2 = block.
# Reads file_path from CLAUDE_TOOL_INPUT (JSON with "file_path" field).

if [[ -z "${CLAUDE_TOOL_INPUT:-}" ]]; then
    exit 0
fi

file_path="$(echo "$CLAUDE_TOOL_INPUT" | grep -oP '"file_path"\s*:\s*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//' || true)"

if [[ -z "$file_path" ]]; then
    exit 0
fi

filename="$(basename "$file_path")"

# Block: sensitive files that should never be written by agents
blocked_patterns=(
    '\.env$'
    '\.env\.'
    'credentials'
    'secret'
    '\.pem$'
    '\.key$'
    'id_rsa'
    'id_ed25519'
    '\.p12$'
    '\.pfx$'
    'token\.json'
)

for pattern in "${blocked_patterns[@]}"; do
    if echo "$file_path" | grep -qiE "$pattern"; then
        echo "BLOCKED: Write to sensitive path detected: $file_path"
        echo "If this is intentional, ask the user to create the file manually."
        exit 2
    fi
done

exit 0
