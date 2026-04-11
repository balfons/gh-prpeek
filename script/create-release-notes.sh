#!/usr/bin/env bash

set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "Usage: $0 <tag-or-version> [output-file]"
  echo "Example: $0 v5.0.3"
  echo "Example: $0 5.0.3 release-notes.md"
  exit 1
fi

INPUT_VERSION="$1"
OUTPUT_FILE="${2:-release-notes.md}"
VERSION="${INPUT_VERSION#v}"

if [ ! -f CHANGELOG.md ]; then
  echo "CHANGELOG.md not found in current directory"
  exit 1
fi

awk -v v="$VERSION" '
  $0 ~ "^## v" v " -" { in_section=1; next }
  in_section && /^## v/ { exit }
  in_section { print }
' CHANGELOG.md > "$OUTPUT_FILE"

if [ ! -s "$OUTPUT_FILE" ]; then
  echo "No changelog section found for v$VERSION"
  exit 1
fi

echo "Release notes written to $OUTPUT_FILE for v$VERSION"