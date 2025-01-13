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

# cd into where current file exists
cd "$(dirname "$0")"

login() {
    hurl --test --variables-file "$env.env" --cookie-jar ./cookie-jar.tsv ./login.hurl 
}

run_with_cookies() {
    # If debug mode then add argument "--error-format long"
    if [ "$DEBUG_MODE" = true ]; then
        hurl --test --jobs 1 --variables-file "$env.env" --cookie ./cookie-jar.tsv \
            --error-format long "${@:1}" --verbose
    else
        hurl --test --jobs 1 --variables-file "$env.env" --cookie ./cookie-jar.tsv "${@:1}"
    fi
}

login
run_with_cookies \
    ./clean-db.hurl \
    ./login-page.tests.hurl \
    ./not-logged-in-redirects.tests.hurl
login
run_with_cookies \
    ./category.tests.hurl \
    ./transaction.tests.hurl \
    ./transaction-htmf.tests.hurl \
    ./export.tests.hurl \
    ./settings.tests.hurl \
    ./logout.tests.hurl

cd -
