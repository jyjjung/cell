#!/bin/bash
# Blocks git push when user-facing commits lack a changelog update in src/data/changelogs.ts

set -euo pipefail

input=$(cat)
command=$(echo "$input" | jq -r '.command // empty')

if ! [[ "$command" =~ git[[:space:]]+push ]]; then
  echo '{"permission":"allow"}'
  exit 0
fi

CHANGELOG_FILE="src/data/changelogs.ts"

if git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
  range='@{u}..HEAD'
else
  base=""
  for ref in origin/master origin/main master main; do
    if git rev-parse --verify "$ref" >/dev/null 2>&1; then
      base=$(git merge-base HEAD "$ref" 2>/dev/null || true)
      [ -n "$base" ] && break
    fi
  done
  if [ -n "$base" ]; then
    range="${base}..HEAD"
  else
    echo '{"permission":"allow"}'
    exit 0
  fi
fi

unpushed_files=$(git diff --name-only "$range" 2>/dev/null || true)

if [ -z "$unpushed_files" ]; then
  echo '{"permission":"allow"}'
  exit 0
fi

non_changelog=$(echo "$unpushed_files" | grep -v "^${CHANGELOG_FILE}$" || true)

if [ -z "$non_changelog" ]; then
  echo '{"permission":"allow"}'
  exit 0
fi

if echo "$unpushed_files" | grep -q "^${CHANGELOG_FILE}$"; then
  echo '{"permission":"allow"}'
  exit 0
fi

if git diff --name-only -- "$CHANGELOG_FILE" | grep -q . || \
   git diff --cached --name-only -- "$CHANGELOG_FILE" | grep -q .; then
  cat <<'EOF'
{
  "permission": "deny",
  "user_message": "Changelog updated but not committed. Commit src/data/changelogs.ts before pushing.",
  "agent_message": "The changelog in src/data/changelogs.ts has uncommitted changes. Commit the new changelogs entry with your other changes, then push."
}
EOF
  exit 2
fi

cat <<'EOF'
{
  "permission": "deny",
  "user_message": "Update the changelog before pushing to GitHub.",
  "agent_message": "This push includes code changes but src/data/changelogs.ts was not updated. Add a new entry at the top of the changelogs array (version, subtitle, date, changes), commit it, then push."
}
EOF
exit 2
