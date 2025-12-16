#!/usr/bin/env bash
bun install

# Install all platform-specific @opentui packages for cross-compilation
bun add @opentui/core-linux-x64 @opentui/core-linux-arm64 @opentui/core-windows-x64 @opentui/core-darwin-x64 @opentui/core-darwin-arm64

FILE_PATH="gh-prpeek_$(echo $1)_linux-x64" TARGET="bun-linux-x64" bun release
FILE_PATH="gh-prpeek_$(echo $1)_linux-arm64" TARGET="bun-linux-arm64" bun release
FILE_PATH="gh-prpeek_$(echo $1)_windows-x64" TARGET="bun-windows-x64" bun release
FILE_PATH="gh-prpeek_$(echo $1)_darwin-x64" TARGET="bun-darwin-x64" bun release
FILE_PATH="gh-prpeek_$(echo $1)_darwin-arm64" TARGET="bun-darwin-arm64" bun release
exit 0
