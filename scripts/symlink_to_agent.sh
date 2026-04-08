#!/usr/bin/env bash
set -euo pipefail

# symlink_to_agent.sh — Maintain symlinks from tool directories to .agent/ canonical source
#
# Creates symlinks in .claude/rules/, .claude/skills/, .codex/rules/, .codex/skills/
# pointing to their canonical counterparts in .agent/rules/ and .agent/skills/.
#
# Run from repo root after adding or removing shared rules/skills in .agent/.
# Safe to re-run — removes stale symlinks and recreates current ones.

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_DIR="${REPO_ROOT}/.agent"
TOOL_DIRS=(".claude" ".codex")

log() { printf '  %s\n' "$1"; }
warn() { printf '  [WARN] %s\n' "$1" >&2; }

sync_symlinks() {
    local source_subdir="$1"  # e.g., "rules" or "skills"
    local agent_source="${AGENT_DIR}/${source_subdir}"

    if [[ ! -d "$agent_source" ]]; then
        warn "Source directory does not exist: ${agent_source}"
        return
    fi

    for tool_dir in "${TOOL_DIRS[@]}"; do
        local target_dir="${REPO_ROOT}/${tool_dir}/${source_subdir}"
        mkdir -p "$target_dir"

        # Remove stale symlinks (pointing to nonexistent targets)
        find "$target_dir" -maxdepth 1 -type l ! -exec test -e {} \; -delete 2>/dev/null || true

        # Remove symlinks that point into .agent/ but whose source no longer exists
        for existing_link in "$target_dir"/*; do
            [[ -L "$existing_link" ]] || continue
            local link_target
            link_target="$(readlink "$existing_link")"
            # If it points to .agent/ and the canonical source is gone, remove it
            if [[ "$link_target" == *".agent/${source_subdir}"* ]] && [[ ! -e "$existing_link" ]]; then
                rm "$existing_link"
                log "Removed stale symlink: ${existing_link}"
            fi
        done

        # Create symlinks for each item in the canonical source
        for item in "$agent_source"/*; do
            [[ -e "$item" ]] || continue
            local item_name
            item_name="$(basename "$item")"
            local link_path="${target_dir}/${item_name}"
            local relative_source
            relative_source="$(realpath --relative-to="$target_dir" "$item")"

            if [[ -L "$link_path" ]]; then
                local current_target
                current_target="$(readlink "$link_path")"
                if [[ "$current_target" == "$relative_source" ]]; then
                    continue  # Already correct
                fi
                rm "$link_path"
            elif [[ -e "$link_path" ]]; then
                warn "Non-symlink exists at ${link_path} — skipping (manual resolution needed)"
                continue
            fi

            ln -s "$relative_source" "$link_path"
            log "Linked: ${tool_dir}/${source_subdir}/${item_name} -> .agent/${source_subdir}/${item_name}"
        done
    done
}

echo "Syncing .agent/ symlinks to tool directories..."
echo ""

echo "Rules:"
sync_symlinks "rules"
echo ""

echo "Skills:"
sync_symlinks "skills"
echo ""

# Verify results
echo "Verification:"
for tool_dir in "${TOOL_DIRS[@]}"; do
    for subdir in rules skills; do
        local_dir="${REPO_ROOT}/${tool_dir}/${subdir}"
        [[ -d "$local_dir" ]] || continue
        count=$(find "$local_dir" -maxdepth 1 -type l | wc -l)
        log "${tool_dir}/${subdir}/: ${count} symlinks"
    done
done

echo ""
echo "Done. Verify with: ls -la .claude/rules/ .claude/skills/ .codex/rules/ .codex/skills/"
