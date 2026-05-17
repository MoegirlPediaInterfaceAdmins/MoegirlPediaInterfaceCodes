#!/usr/bin/env bash

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/../.." && pwd)"
script_path="$repo_root/scripts/hooks/prepare-nodejs-pre-tool-use.js"

if command -v node >/dev/null 2>&1; then
    node "$script_path" "$repo_root"
    exit 0
fi

printf '%s\n' '{"continue":false,"stopReason":"Node.js is unavailable","systemMessage":"未检测到 Node.js","hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"Node.js is unavailable"}}'
exit 2
