#!/usr/bin/env bash
set -euo pipefail

# Stop hook: session-end checkpoint reminders.
# Always exits 0 (informational only, never blocks).

echo ""
echo "=== Session Checkpoint Reminders ==="
echo "  M7: Update relevant .agent/progress/*.json workstreams with durable changes"
echo "  M6: If documentation was affected, verify it matches current state"
echo "  M8: If shared content changed, verify all tool surfaces are updated"
echo "  M10: If output quality was subpar, consider agentic surface improvements"
echo "==================================="
echo ""

exit 0
