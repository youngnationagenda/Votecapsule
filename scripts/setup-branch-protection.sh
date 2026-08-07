#!/usr/bin/env bash
# =============================================================
# VoteCapsule™ — Branch Protection Setup
# scripts/setup-branch-protection.sh
#
# Applies branch protection rules to master via the GitHub API.
# Run once after the pr-quality-gate workflow has been pushed.
#
# Requires: GITHUB_TOKEN with repo admin permissions
# Usage:
#   export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
#   bash scripts/setup-branch-protection.sh
# =============================================================

set -euo pipefail

OWNER="youngnationagenda"
REPO="Votecapsule"
BRANCH="master"
API="https://api.github.com/repos/${OWNER}/${REPO}/branches/${BRANCH}/protection"

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "❌ GITHUB_TOKEN is not set."
  echo "   Export a GitHub personal access token with repo admin scope:"
  echo "   export GITHUB_TOKEN=ghp_xxxxxxxxxxxx"
  exit 1
fi

echo "🔒 Applying branch protection to ${OWNER}/${REPO}:${BRANCH} ..."

curl -s -X PUT "$API" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": [
        "✅ All quality gates passed"
      ]
    },
    "enforce_admins": false,
    "required_pull_request_reviews": {
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": true,
      "required_approving_review_count": 1,
      "require_last_push_approval": true
    },
    "restrictions": null,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "block_creations": false,
    "required_conversation_resolution": true,
    "lock_branch": false
  }' | jq '.'

echo ""
echo "✅ Branch protection applied. Rules active on master:"
echo "   - PR required before merge (no direct pushes)"
echo "   - 1 approving review required (CODEOWNERS enforced)"
echo "   - Code owner review required"
echo "   - Stale reviews dismissed on new commits"
echo "   - Last push must be approved (stops self-approval)"
echo "   - Status check required: '✅ All quality gates passed'"
echo "   - Status check must be up-to-date with master"
echo "   - All PR conversations must be resolved"
echo "   - Force pushes blocked"
echo "   - Branch deletion blocked"
