#!/usr/bin/env bash

if command -v node >/dev/null 2>&1; then
    version="$(node --version 2>/dev/null)"

    if [[ -n "$version" ]]; then
        message="Node.js version: $version"
        node -e 'console.log(JSON.stringify({continue:true,hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:process.argv[1]}}))' "$message"
        exit 0
    fi

    printf '%s\n' '{"continue":true,"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"Node.js version check returned no output"}}'
    exit 0
fi

printf '%s\n' '{"continue":true,"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"Node.js is unavailable"}}'
