#!/bin/bash
# ============================================================
# VoteCapsule™ — Create ECR Repositories for New Services
#
# Run once to create any new ECR repos needed.
# Safe to re-run: existing repos are skipped.
#
# Usage: bash create-new-ecr-repos.sh
# ============================================================

set -e

ACCOUNT_ID=683541453923
REGION=us-east-1
REPOS=(
  "vote-capsule/notification-service"
  "vote-capsule/candidate-service"
  "vote-capsule/reporting-service"
  "vote-capsule/election-service"
  "vote-capsule/audit-service"
  "vote-capsule/billing-service"
)

echo "Creating ECR repositories in ${REGION}..."

for REPO in "${REPOS[@]}"; do
  echo -n "  Creating ${REPO}... "
  aws ecr create-repository \
    --repository-name "${REPO}" \
    --region "${REGION}" \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    --output json 2>/dev/null \
    && echo "✅ Created" \
    || echo "⚠️  Already exists (OK)"
done

echo ""
echo "Verifying all repos..."
aws ecr describe-repositories \
  --region "${REGION}" \
  --query "repositories[?starts_with(repositoryName, 'vote-capsule/')].repositoryName" \
  --output table

echo ""
echo "Done. Trigger GitHub Actions to build images:"
echo "  git -C D:/Votecapsule/vote-capsule add ."
echo "  git -C D:/Votecapsule/vote-capsule commit -m 'feat: wire candidate, notification, reporting, election services'"
echo "  git -C D:/Votecapsule/vote-capsule push"
