# Vote Capsule™ — Trust Service
# Port: 3003
ARG SERVICE_PORT=3003
ARG GIT_SHA=local

# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM public.ecr.aws/docker/library/node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages/ ./packages/
COPY services/trust/ ./services/trust/

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @vote-capsule/types build 2>/dev/null || true
RUN pnpm --filter @vote-capsule/database build 2>/dev/null || true && mkdir -p /app/packages/database/dist
RUN cd /app/services/trust && npx tsc --project tsconfig.json --noEmitOnError false
RUN pnpm --filter @vote-capsule/trust-service deploy --prod /tmp/trust-deploy

# ── Stage 2: runner ──────────────────────────────────────────────────────────
FROM public.ecr.aws/docker/library/node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG SERVICE_PORT
ARG GIT_SHA
ENV PORT=$SERVICE_PORT
ENV GIT_SHA=$GIT_SHA

COPY --from=builder /tmp/trust-deploy/node_modules             ./node_modules
COPY --from=builder /app/services/trust/dist                   ./dist
COPY --from=builder /app/services/trust/package.json           ./package.json
COPY --from=builder /app/packages/types/dist/cjs               ./node_modules/@vote-capsule/types/dist/cjs
COPY --from=builder /app/packages/types/dist/esm               ./node_modules/@vote-capsule/types/dist/esm
COPY --from=builder /app/packages/database/dist                ./node_modules/@vote-capsule/database/dist

LABEL org.opencontainers.image.title="vote-capsule-trust-service" \
      org.opencontainers.image.revision=$GIT_SHA \
      org.opencontainers.image.created="2026-08-04"

EXPOSE $SERVICE_PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:$PORT/health || exit 1
CMD ["node", "dist/main"]
