# Vote Capsule™ — Evidence Service
# Port: 3002
ARG SERVICE_PORT=3002
ARG GIT_SHA=local

# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM public.ecr.aws/docker/library/node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages/ ./packages/
COPY services/evidence/ ./services/evidence/

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @vote-capsule/types build 2>/dev/null || true
RUN pnpm --filter @vote-capsule/database build 2>/dev/null || true && mkdir -p /app/packages/database/dist
RUN cd /app/services/evidence && npx tsc --project tsconfig.json --noEmitOnError false
RUN pnpm --filter @vote-capsule/evidence-service deploy --prod /tmp/evidence-deploy

# ── Stage 2: runner ──────────────────────────────────────────────────────────
FROM public.ecr.aws/docker/library/node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG SERVICE_PORT
ARG GIT_SHA
ENV PORT=$SERVICE_PORT
ENV GIT_SHA=$GIT_SHA

COPY --from=builder /tmp/evidence-deploy/node_modules          ./node_modules
COPY --from=builder /app/services/evidence/dist                ./dist
COPY --from=builder /app/services/evidence/package.json        ./package.json
COPY --from=builder /app/packages/types/dist/cjs               ./node_modules/@vote-capsule/types/dist/cjs
COPY --from=builder /app/packages/types/dist/esm               ./node_modules/@vote-capsule/types/dist/esm
COPY --from=builder /app/packages/database/dist                ./node_modules/@vote-capsule/database/dist

LABEL org.opencontainers.image.title="vote-capsule-evidence-service" \
      org.opencontainers.image.revision=$GIT_SHA \
      org.opencontainers.image.created="2026-08-04"

EXPOSE $SERVICE_PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:$PORT/health || exit 1
CMD ["node", "dist/main"]
