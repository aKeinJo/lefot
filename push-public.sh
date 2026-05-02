#!/bin/bash
# Push a clean public snapshot to the 'public' remote.
# - Creates an orphan branch (no shared history with private repo)
# - Excludes: .agents/ .gemini/ .github/ CLAUDE.md
# Usage: bash push-public.sh [commit message]
set -e

CURRENT=$(git branch --show-current)
MSG=${1:-"snapshot: $(date +%Y-%m-%d)"}

echo "Creating orphan snapshot from '$CURRENT'..."

git checkout --orphan _pub-temp

# Remove private files from index only (disk untouched)
git rm -rf --cached --quiet .agents .gemini .github CLAUDE.md 2>/dev/null || true

git commit -m "$MSG"

echo "Pushing to public remote..."
git push public HEAD:main --force

git checkout -f "$CURRENT"
git branch -D _pub-temp

echo "Done. Pushed to public/main (no shared history with $CURRENT)"
