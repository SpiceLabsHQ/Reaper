#!/bin/bash

# ACLI JIRA Authentication Script
# Reusable script for authenticating ACLI with Jira across all projects
# Usage: source ~/.claude/scripts/acli-jira-auth.sh
# Or: bash ~/.claude/scripts/acli-jira-auth.sh

# Function to print status messages (define locally if not available)
print_status() {
    echo "📋 $1"
}

print_success() {
    echo "✅ $1"
}

print_warning() {
    echo "⚠️  $1"
}

print_error() {
    echo "❌ $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main ACLI JIRA Authentication Function
authenticate_acli_jira() {
    print_status "Setting up ACLI JIRA authentication..."

    # Try .env file first (respects local development preferences)
    if [ -f "/workspace/.env" ]; then
        print_status "Loading JIRA variables from .env file..."
        set -a  # automatically export all variables
        source /workspace/.env 2>/dev/null || true
        set +a
    fi

    # Fallback: load credentials from file if .env didn't provide them
    if [ -z "$JIRA_SITE" ] && [ -f "/home/vscode/.claude/acli-credentials" ]; then
        print_status "Loading ACLI credentials from file as fallback..."
        source /home/vscode/.claude/acli-credentials 2>/dev/null || true
    fi

    # Attempt authentication if all credentials are available
    if [ -n "$JIRA_SITE" ] && [ -n "$JIRA_EMAIL" ] && [ -n "$JIRA_TOKEN" ]; then
        if command_exists acli; then
            print_status "Configuring ACLI with provided credentials..."
            
            # Create a temporary file for the token (more secure than echo)
            TEMP_TOKEN_FILE=$(mktemp)
            echo "$JIRA_TOKEN" > "$TEMP_TOKEN_FILE"
            
            # Attempt ACLI authentication with timeout
            if timeout 30 acli jira auth login --site "$JIRA_SITE" --email "$JIRA_EMAIL" --token < "$TEMP_TOKEN_FILE" 2>/dev/null; then
                print_success "ACLI JIRA authentication completed successfully"
                # Verify authentication by testing a simple command
                if acli jira workitem view --help >/dev/null 2>&1; then
                    print_success "ACLI is ready for use with Jira commands"
                    return 0
                else
                    print_warning "ACLI authenticated but may have issues with commands"
                    return 1
                fi
            else
                print_warning "ACLI JIRA authentication failed - check credentials and network connectivity"
                print_status "ACLI can be manually configured later with: acli jira auth login"
                return 1
            fi
            
            # Clean up temporary token file
            rm -f "$TEMP_TOKEN_FILE"
        else
            print_warning "ACLI not found - authentication skipped"
            return 1
        fi
    else
        print_status "ACLI JIRA authentication skipped (missing JIRA_SITE, JIRA_EMAIL, or JIRA_TOKEN)"
        print_status "To enable ACLI, add JIRA credentials to .env file or create ~/.claude/acli-credentials file and rebuild the container"
        return 1
    fi
}

# Run authentication if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    authenticate_acli_jira
fi