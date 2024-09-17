#!/usr/bin/env bash
bun install
FILE_PATH="dist/gh-prpeek_$(echo $1)_darwin-amd64" bun compile
exit 0
