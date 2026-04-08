#!/usr/bin/env bash
set -euo pipefail

# PostToolUse hook for Write|Edit: check for trailing whitespace and missing EOF newline.
# Exit 0 = clean, Exit 1 = warn (non-blocking).
# Does NOT auto-fix — auto-formatting is language-specific.

if [[ -z "${CLAUDE_TOOL_INPUT:-}" ]]; then
    exit 0
fi

file_path="$(echo "$CLAUDE_TOOL_INPUT" | grep -oP '"file_path"\s*:\s*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//' || true)"

if [[ -z "$file_path" ]] || [[ ! -f "$file_path" ]]; then
    exit 0
fi

# Skip binary files
if file "$file_path" | grep -q "binary"; then
    exit 0
fi

issues=()

# Check trailing whitespace
if grep -qP '[ \t]+$' "$file_path" 2>/dev/null; then
    count=$(grep -cP '[ \t]+$' "$file_path" 2>/dev/null || true)
    issues+=("Trailing whitespace found on $count line(s)")
fi

# Check missing final newline
if [[ -s "$file_path" ]] && [[ "$(tail -c 1 "$file_path" | wc -l)" -eq 0 ]]; then
    issues+=("Missing final newline")
fi

if [[ ${#issues[@]} -gt 0 ]]; then
    echo "Lint warnings for: $file_path"
    for issue in "${issues[@]}"; do
        echo "  - $issue"
    done
    exit 1
fi

exit 0
