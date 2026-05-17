#!/usr/bin/env bash

emit_json() {
    local additional_context="$1"

    if command -v node >/dev/null 2>&1; then
        node -e 'console.log(JSON.stringify({continue:true,hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:process.argv[1]}}))' "$additional_context"
        return
    fi

    printf '%s\n' '{"continue":true,"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Node.js is unavailable to encode SessionStart output"}}'
}

message='Skipped n lts: GITHUB_ACTIONS is not true'

if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
    if sudo -n true >/dev/null 2>&1; then
        output="$(sudo -n n lts 2>&1)"
        status=$?

        if [[ "$status" -eq 0 ]]; then
            hash -r

            if [[ -n "$output" ]]; then
                message="$(printf 'n lts output:\n%s' "$output")"
            else
                message='n lts completed without output'
            fi
        elif [[ -n "$output" ]]; then
            message="$(printf 'n lts failed (exit %s):\n%s' "$status" "$output")"
        else
            message="$(printf 'n lts failed (exit %s)' "$status")"
        fi
    else
        message='Skipped n lts: sudo requires a password or is unavailable'
    fi
fi

emit_json "$message"
