#!/bin/bash

# Check if debug mode is enabled
DEBUG_MODE=false
if [ "$2" == "--debug" ]; then
    DEBUG_MODE=true
fi

# Get environment argument (argument 1)
env=$1

# Check if environment is provided
if [ -z "$env" ]; then
    env="local"
fi

# Function to run hurl tests
run_hurl_tests() {
    local test_file=$1
    if $DEBUG_MODE; then
        echo "Running $test_file in debug mode..."
        hurl --verbose "$test_file" --variables-file "$env.env" "${@:2}"
    else
        echo "Running $test_file..."
        hurl "$test_file" --variables-file "$env.env" "${@:2}"
    fi
}

# cd into where current file exists
cd "$(dirname "$0")"

# Find all .hurl files and run tests
run_hurl_tests ./login.hurl --cookie-jar ./cookie-jar.tsv
run_hurl_tests ./clean-db.hurl --cookie ./cookie-jar.tsv
run_hurl_tests ./logged-in-redirects.tests.hurl &
run_hurl_tests ./login-page.tests.hurl &
run_hurl_tests ./login.hurl --cookie-jar ./cookie-jar.tsv
run_hurl_tests ./create.tests.hurl --cookie ./cookie-jar.tsv
run_hurl_tests ./delete.tests.hurl --cookie ./cookie-jar.tsv

cd -
