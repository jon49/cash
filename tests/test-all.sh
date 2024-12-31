#!/bin/bash

# Default values
DEBUG_MODE=false
env="local"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --debug) DEBUG_MODE=true ;;
        --env) env="$2"; shift ;;
        --help) 
            echo "Usage: $0 [--debug] [--env <environment>]"
            exit 0
            ;;
        *) 
            echo "Unknown parameter passed: $1"
            echo "Usage: $0 [--debug] [--env <environment>]"
            exit 1
            ;;
    esac
    shift
done

# Function to run hurl tests
run_hurl_tests() {
    local test_file=$1
    if $DEBUG_MODE; then
        echo "Running $test_file in debug mode…"
        echo "hurl --verbose \"$test_file\" --variables-file \"$env.env\" \"${@:2}\""
        hurl --verbose "$test_file" --variables-file "$env.env" "${@:2}"
    else
        echo "Running $test_file…"
        echo "hurl \"$test_file\" --variables-file \"$env.env\" \"${@:2}\" --no-output"
        hurl "$test_file" --variables-file "$env.env" "${@:2}" --no-output
    fi
}

# cd into where current file exists
cd "$(dirname "$0")"

# Find all .hurl files and run tests
run_hurl_tests ./login.hurl --cookie-jar ./cookie-jar.tsv
run_hurl_tests ./clean-db.hurl --cookie ./cookie-jar.tsv
run_hurl_tests ./login-page.tests.hurl &
run_hurl_tests ./not-logged-in-redirects.tests.hurl &
run_hurl_tests ./login.hurl --cookie-jar ./cookie-jar.tsv
run_hurl_tests ./category.tests.hurl --cookie ./cookie-jar.tsv
run_hurl_tests ./transaction.tests.hurl --cookie ./cookie-jar.tsv
run_hurl_tests ./transaction-htmf.tests.hurl --cookie ./cookie-jar.tsv
run_hurl_tests ./export.tests.hurl --cookie ./cookie-jar.tsv
run_hurl_tests ./logout.tests.hurl --cookie ./cookie-jar.tsv

cd -
