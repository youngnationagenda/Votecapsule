#!/usr/bin/env bash
# ============================================================
# VoteCapsule™ — Fix GitHub Actions OIDC Trust Policy
# infrastructure/scripts/fix-oidc-trust-policy.sh
#
# Fixes: "Could not assume role with OIDC: Not authorized to
# perform sts:AssumeRoleWithWebIdentity"
#
# Root causes (two separate issues):
#   1. IAM OIDC provider thumbprint is stale (GitHub rotated certs)
#   2. Trust policy sub-claim condition too strict
#
# Run once from any machine with AWS CLI + admin credentials.
# ============================================================
set -e

ROLE_NAME="vote-capsule-github-actions-role"
ACCOUNT_ID="683541453923"
REGION="us-east-1"
REPO_OWNER="youngnationagenda"
REPO_NAME="Votecapsule"

echo "🔧 Fixing GitHub Actions OIDC for ${REPO_OWNER}/${REPO_NAME}"
echo ""

# ── Step 1: Update the OIDC provider thumbprints ─────────────────────────────
# GitHub updated their OIDC certificate in 2023.
# AWS now validates OIDC via the well-known endpoint directly,
# but we still need at least one valid thumbprint in the provider config.
# The current valid thumbprints for token.actions.githubusercontent.com:

echo "Step 1: Updating OIDC provider thumbprints..."
OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"

aws iam update-open-id-connect-provider-thumbprint \
  --open-id-connect-provider-arn "${OIDC_ARN}" \
  --thumbprint-list \
    "6938fd4d98bab03faadb97b34396831e3780aea1" \
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd" \
  --region "${REGION}"

echo "✅ OIDC provider thumbprints updated"
echo ""

# ── Step 2: Update trust policy ──────────────────────────────────────────────
# The trust policy sub-claim condition must match the GitHub OIDC token subject.
# GitHub OIDC subject format: repo:{owner}/{repo}:ref:refs/heads/{branch}
# OR for workflow_dispatch: repo:{owner}/{repo}:ref:refs/heads/{branch}
#
# We use StringLike with wildcards to allow all branches and workflow triggers.

echo "Step 2: Updating trust policy..."

cat > /tmp/oidc-trust-policy.json << 'TRUST_EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::683541453923:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:youngnationagenda/Votecapsule:*",
            "repo:youngnationagenda/votecapsule:*",
            "repo:youngnationagenda/vote-capsule:*",
            "repo:youngnationagenda/VoteCapsule:*"
          ]
        }
      }
    }
  ]
}
TRUST_EOF

aws iam update-assume-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-document file:///tmp/oidc-trust-policy.json \
  --region "${REGION}"

echo "✅ Trust policy updated"
echo ""

# ── Step 3: Verify the role still has permissions ────────────────────────────
echo "Step 3: Verifying role policies..."
POLICIES=$(aws iam list-role-policies --role-name "${ROLE_NAME}" --region "${REGION}" --query 'PolicyNames' --output text)
echo "  Inline policies: ${POLICIES:-NONE}"

ATTACHED=$(aws iam list-attached-role-policies --role-name "${ROLE_NAME}" --region "${REGION}" --query 'AttachedPolicies[*].PolicyName' --output text)
echo "  Attached policies: ${ATTACHED:-NONE}"

# If no policies, re-attach the github-actions ECR+ECS+S3 policy
if [ -z "$POLICIES" ] && [ -z "$ATTACHED" ]; then
  echo ""
  echo "⚠️  No policies found! Re-attaching required permissions..."

  cat > /tmp/github-actions-policy.json << 'POLICY_EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRPush",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage",
        "ecr:DescribeImages",
        "ecr:DescribeRepositories"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECSUpdate",
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:ListTaskDefinitions"
      ],
      "Resource": "*"
    },
    {
      "Sid": "S3PortalDeploy",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:PutBucketWebsite",
        "s3:PutBucketPolicy",
        "s3:PutPublicAccessBlock",
        "s3:CreateBucket"
      ],
      "Resource": [
        "arn:aws:s3:::vote-capsule-*",
        "arn:aws:s3:::vote-capsule-*/*"
      ]
    },
    {
      "Sid": "CloudFrontInvalidate",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetDistributionConfig",
        "cloudfront:UpdateDistribution",
        "cloudfront:GetDistribution"
      ],
      "Resource": "*"
    },
    {
      "Sid": "IAMPassRole",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::683541453923:role/vote-capsule-*"
    },
    {
      "Sid": "CodeBuildTrigger",
      "Effect": "Allow",
      "Action": [
        "codebuild:StartBuild",
        "codebuild:BatchGetBuilds"
      ],
      "Resource": "*"
    }
  ]
}
POLICY_EOF

  aws iam put-role-policy \
    --role-name "${ROLE_NAME}" \
    --policy-name "github-actions-ecr-ecs-s3-cf" \
    --policy-document file:///tmp/github-actions-policy.json \
    --region "${REGION}"

  echo "✅ Policy re-attached"
fi

echo ""
echo "✅ All OIDC fixes applied!"
echo ""
echo "Next: Trigger a new workflow run to verify:"
echo "  cd D:\\Votecapsule\\vote-capsule"
echo "  git commit --allow-empty -m \"chore: re-trigger CI after OIDC fix\""
echo "  git push origin master"
