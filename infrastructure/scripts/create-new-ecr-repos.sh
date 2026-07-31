#!/bin/bash
# ============================================================
# VoteCapsule™ — Create ECR Repositories for Phase 7 Services
#
# Run once to create the 4 new ECR repos needed for:
#   - notification-service  (port 3008)
#   - candidate-service     (port 3009)
#   - reporting-service     (port 3010)
#   - election-service      (port 3011)
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
