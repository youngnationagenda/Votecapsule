# Vote Capsule™ — Identity Service
# Monorepo-aware Docker build
ARG SERVICE_PORT=3001
ARG GIT_SHA=local

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9 --silent

# Copy monorepo root manifests
COPY package.json pnpm-workspace.yaml tsconfig.base.json turbo.json ./

# Copy shared packages
COPY packages/ ./packages/

# Copy this service
COPY services/identity/ ./services/identity/

# Install all dependencies (no lockfile required for first build)
RUN pnpm install --no-frozen-lockfile

# Build shared packages first, then the service
RUN pnpm --filter @vote-capsule/types build 2>/dev/null || true
RUN pnpm --filter @vote-capsule/database build 2>/dev/null || true
RUN pnpm --filter @vote-capsule/identity-service build

# ── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

ARG SERVICE_PORT
ARG GIT_SHA
ENV PORT=$SERVICE_PORT
ENV GIT_SHA=$GIT_SHA

# Copy built output and dependencies
COPY --from=builder /app/services/identity/dist ./dist
COPY --from=builder /app/services/identity/node_modules ./node_modules
COPY --from=builder /app/services/identity/package.json ./package.json

EXPOSE $SERVICE_PORT

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:$SERVICE_PORT/health || exit 1

CMD ["node", "dist/main"]
