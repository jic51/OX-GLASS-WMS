#!/usr/bin/env bash
# Recreate a git tag for every released version, from the commit subjects.
#
# WHY THIS EXISTS RATHER THAN THE TAGS SIMPLY BEING PUSHED.
#
# The tags were created locally and the push was refused: this session's GitHub
# credentials are scoped to the working branch and answer 403 on refs/tags/*.
# That could have been left as "Jose pushes them himself one day", which is how
# a verification procedure quietly stops working.
#
# Instead the tags are DERIVED, not stored. Every release commit already starts
# its subject with "vN.N — ", so the mapping from version to commit is in the
# history itself and this script reconstructs it in any clone, in one command.
# The tags being absent from the remote stops mattering.
#
# It is idempotent: a tag that already exists is left alone, so running it
# after every release only ever adds the new one.
#
#   bash tools/tag-releases.sh          create any missing tags
#   bash tools/tag-releases.sh --list   show what exists, newest first
#
# Then verify a customer's file against the version it claims to be:
#   git show v10.9:Code_v3_fixed.gs | diff - /path/to/their/Code.gs

set -euo pipefail
cd "$(dirname "$0")/.."

if [ "${1:-}" = "--list" ]; then
  git tag --sort=-v:refname | head -40
  echo "…"
  echo "$(git tag | wc -l | tr -d ' ') tags total"
  exit 0
fi

created=0
skipped=0

# %H = full sha, %s = subject. Only subjects that START with a version.
while IFS='|' read -r sha subject; do
  case "$subject" in
    v[0-9]*) ;;
    *) continue ;;
  esac
  ver="${subject%% *}"          # "v10.9 — ..." -> "v10.9"
  ver="${ver%%—*}"              # tolerate a missing space before the dash
  # Only digits and dots after the v; a subject like "v2 rewrite" is not a
  # release and must not become a tag that later confuses a verification.
  case "${ver#v}" in
    ''|*[!0-9.]*) continue ;;
  esac
  if git rev-parse -q --verify "refs/tags/$ver" >/dev/null; then
    skipped=$((skipped+1))
  else
    git tag -a "$ver" "$sha" -m "Acopio $ver"
    created=$((created+1))
  fi
done < <(git log --pretty='%H|%s')

echo "tags: $created created, $skipped already present, $(git tag | wc -l | tr -d ' ') total"
echo
echo "Verify a customer's file:"
echo "  git show <tag>:Code_v3_fixed.gs   | diff - their-Code.gs"
echo "  git show <tag>:Index_v3_fixed.html | diff - their-Index.html"
echo "Or check the stamped fingerprint without needing a tag at all:"
echo "  node tools/build-fingerprint.js --check their-Code.gs their-Index.html"
