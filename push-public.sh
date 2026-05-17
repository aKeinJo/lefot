#!/bin/bash
# Push a clean public snapshot to the 'public' remote.
# - Accumulates commit history on public/main
# - Excludes: .agents/ .gemini/ .github/ CLAUDE.md
# Usage: bash push-public.sh [commit message]
set -e

CURRENT=$(git branch --show-current)
MSG=${1:-"snapshot: $(date +%Y-%m-%d)"}

# Clean up any leftover _pub branch from a previous failed run
git branch -D _pub 2>/dev/null || true

# Try to fetch existing public/main; fall back to orphan on first run
if git fetch public main:_pub 2>/dev/null; then
  echo "Continuing from existing public/main history..."
  git checkout _pub
else
  echo "No existing public/main — starting fresh orphan..."
  git checkout --orphan _pub
  git rm -rf --cached . 2>/dev/null || true
fi

# Overlay all files from the current branch (index + working tree)
git rm -rf --cached --quiet . 2>/dev/null || true
git checkout "$CURRENT" -- .

# Remove private files from index only (disk untouched)
git rm -rf --cached --quiet .agents .gemini .github CLAUDE.md 2>/dev/null || true

# Commit as aKeinJo
git -c user.name="aKeinJo" -c user.email="cwsa234@gmail.com" commit -m "$MSG"

echo "Pushing to public remote..."
git push public _pub:main

git checkout -f "$CURRENT"
git branch -D _pub

echo "Done. Pushed to public/main"
