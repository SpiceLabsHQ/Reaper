#!/usr/bin/env bash
set -euo pipefail

# Update the status of an issue's GitHub Projects v2 item.
# Resolves project item, field, and option IDs internally.
#
# Usage:
#   gh-project-set-status.sh <issue-url-or-number> <status-value> [--field <field-name>] [--project <project-number>]
#
# Examples:
#   gh-project-set-status.sh 42 "In Progress"
#   gh-project-set-status.sh 42 "Done" --project 5
#   gh-project-set-status.sh https://github.com/owner/repo/issues/42 "Todo" --field "Priority"

# ─── Argument Parsing ───────────────────────────────────────────────────────

FIELD_NAME="Status"
PROJECT_NUMBER=""

if [[ $# -lt 2 ]]; then
  echo "Usage: gh-project-set-status.sh <issue-url-or-number> <status-value> [--field <field-name>] [--project <project-number>]" >&2
  exit 1
fi

ISSUE_REF="$1"
STATUS_VALUE="$2"
shift 2

while [[ $# -gt 0 ]]; do
  case "$1" in
    --field)
      FIELD_NAME="$2"
      shift 2
      ;;
    --project)
      PROJECT_NUMBER="$2"
      shift 2
      ;;
    *)
      echo "Error: Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# ─── Resolve Issue Node ID ──────────────────────────────────────────────────

ISSUE_JSON=$(gh issue view "$ISSUE_REF" --json id,url,repository)
ISSUE_ID=$(echo "$ISSUE_JSON" | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  process.stdout.write(d.id);
")

if [[ -z "$ISSUE_ID" ]]; then
  echo "Error: Could not resolve node ID for issue ${ISSUE_REF}" >&2
  exit 1
fi

# ─── Query Project Items ────────────────────────────────────────────────────

ITEMS_JSON=$(gh api graphql -f query='
  query($nodeId: ID!) {
    node(id: $nodeId) {
      ... on Issue {
        projectItems(first: 20) {
          nodes {
            id
            project {
              id
              number
              fields(first: 30) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options { id name }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
' -f nodeId="$ISSUE_ID")

# ─── Filter and Validate ────────────────────────────────────────────────────

# Use node to parse the JSON and find the matching project item, field, and option
RESULT=$(echo "$ITEMS_JSON" | PROJECT_NUMBER="$PROJECT_NUMBER" FIELD_NAME="$FIELD_NAME" STATUS_VALUE="$STATUS_VALUE" node -e "
  const input = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
  const items = (input.data && input.data.node && input.data.node.projectItems && input.data.node.projectItems.nodes) || [];
  const projectNumber = process.env.PROJECT_NUMBER;
  const fieldName = process.env.FIELD_NAME;
  const statusValue = process.env.STATUS_VALUE;

  // Filter by project number if specified
  let candidates = items;
  if (projectNumber) {
    candidates = items.filter(i => String(i.project.number) === projectNumber);
  }

  if (candidates.length === 0) {
    if (projectNumber) {
      process.stderr.write('Warning: Issue is not linked to project #' + projectNumber + '\n');
    } else {
      process.stderr.write('Warning: Issue is not linked to any project\n');
    }
    process.stdout.write(JSON.stringify({ action: 'warn_exit' }));
    process.exit(0);
  }

  // Use the first matching project item
  const item = candidates[0];

  // Find the target field
  const fields = (item.project.fields && item.project.fields.nodes) || [];
  const field = fields.find(f => f.name === fieldName);
  if (!field) {
    process.stderr.write('Error: Field \"' + fieldName + '\" not found on project #' + item.project.number + '\n');
    process.stdout.write(JSON.stringify({ action: 'error_exit' }));
    process.exit(0);
  }

  // Find the matching option
  const option = (field.options || []).find(o => o.name === statusValue);
  if (!option) {
    const available = (field.options || []).map(o => o.name).join(', ');
    process.stderr.write('Error: Invalid status \"' + statusValue + '\" for field \"' + fieldName + '\". Available: ' + available + '\n');
    process.stdout.write(JSON.stringify({ action: 'error_exit' }));
    process.exit(0);
  }

  process.stdout.write(JSON.stringify({
    action: 'update',
    itemId: item.id,
    projectId: item.project.id,
    projectNumber: item.project.number,
    fieldId: field.id,
    optionId: option.id,
  }));
")

# Parse the action from the result
ACTION=$(echo "$RESULT" | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  process.stdout.write(d.action);
")

if [[ "$ACTION" == "warn_exit" ]]; then
  exit 0
fi

if [[ "$ACTION" == "error_exit" ]]; then
  exit 1
fi

# ─── Update the Project Item ────────────────────────────────────────────────

ITEM_ID=$(echo "$RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(d.itemId);")
PROJECT_ID=$(echo "$RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(d.projectId);")
PROJ_NUM=$(echo "$RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(String(d.projectNumber));")
FIELD_ID=$(echo "$RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(d.fieldId);")
OPTION_ID=$(echo "$RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(d.optionId);")

gh api graphql -f query='
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $fieldId
      value: { singleSelectOptionId: $optionId }
    }) {
      projectV2Item { id }
    }
  }
' -f projectId="$PROJECT_ID" -f itemId="$ITEM_ID" -f fieldId="$FIELD_ID" -f optionId="$OPTION_ID" > /dev/null

echo "Updated project #${PROJ_NUM}: set ${FIELD_NAME} to \"${STATUS_VALUE}\""
