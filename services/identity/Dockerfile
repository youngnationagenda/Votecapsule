# Vote Capsule(tm) -- Identity Service
# Monorepo-aware Docker build using ECR Public mirror
ARG SERVICE_PORT=3001
ARG GIT_SHA=local

FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9 --silent
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages/ ./packages/
COPY services/identity/ ./services/identity/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @vote-capsule/types build 2>/dev/null || true
RUN pnpm --filter @vote-capsule/database build 2>/dev/null || true && mkdir -p /app/packages/database/dist
# Use tsc directly for reliable monorepo builds
RUN cd services/identity && npx tsc --project tsconfig.json
# Produce a self-contained node_modules for the service using deploy
RUN pnpm --filter @vote-capsule/identity-service deploy --prod /app/deploy/identity

FROM public.ecr.aws/docker/library/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG SERVICE_PORT
ARG GIT_SHA
ENV PORT=$SERVICE_PORT
ENV GIT_SHA=$GIT_SHA
# Copy the self-contained production node_modules from pnpm deploy
COPY --from=builder /app/deploy/identity/node_modules ./node_modules
# Copy compiled service dist
COPY --from=builder /app/services/identity/dist ./dist
COPY --from=builder /app/services/identity/package.json ./package.json
# Copy built shared packages to all possible paths pnpm might use
COPY --from=builder /app/packages/types/dist/cjs ./node_modules/@vote-capsule/types/dist/cjs
COPY --from=builder /app/packages/types/dist/esm ./node_modules/@vote-capsule/types/dist/esm
COPY --from=builder /app/packages/database/dist ./node_modules/@vote-capsule/database/dist
EXPOSE $SERVICE_PORT
HEALTHCHECK NONE
CMD ["node", "dist/main"]
