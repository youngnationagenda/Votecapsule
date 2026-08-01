# Vote Capsule(tm) -- Audit Service
# Monorepo-aware Docker build using ECR Public mirror
ARG SERVICE_PORT=3012
ARG GIT_SHA=local

FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9 --silent
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages/ ./packages/
COPY services/audit/ ./services/audit/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @vote-capsule/types build 2>/dev/null || true
RUN pnpm --filter @vote-capsule/database build 2>/dev/null || true && mkdir -p /app/packages/database/dist
RUN pnpm --filter @vote-capsule/audit-service build
# Produce a self-contained node_modules for the service using deploy
RUN pnpm --filter @vote-capsule/audit-service deploy --prod /app/deploy/audit

FROM public.ecr.aws/docker/library/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG SERVICE_PORT
ARG GIT_SHA
ENV PORT=$SERVICE_PORT
ENV GIT_SHA=$GIT_SHA
# Copy the self-contained production node_modules from pnpm deploy
COPY --from=builder /app/deploy/audit/node_modules ./node_modules
# Copy compiled service dist
COPY --from=builder /app/services/audit/dist ./dist
COPY --from=builder /app/services/audit/package.json ./package.json
# Copy built shared packages to all possible paths pnpm might use
COPY --from=builder /app/packages/types/dist ./node_modules/@vote-capsule/types/dist
COPY --from=builder /app/packages/database/dist ./node_modules/@vote-capsule/database/dist
# Also copy to pnpm virtual store path (handles hoisted modules)
RUN find ./node_modules/.pnpm -name "@vote-capsule+types*" -type d 2>/dev/null | while read d; do cp -r ./node_modules/@vote-capsule/types/dist $d/node_modules/@vote-capsule/types/ 2>/dev/null || true; done
EXPOSE $SERVICE_PORT
HEALTHCHECK NONE
CMD ["node", "dist/main"]
