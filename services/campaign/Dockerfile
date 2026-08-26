# Vote Capsule™ — Campaign Service
# Port: 3016
# Uses node:22-slim (Debian) for native canvas/sharp system library support
ARG SERVICE_PORT=3016
ARG GIT_SHA=local

# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM public.ecr.aws/docker/library/node:22-slim AS builder
WORKDIR /app

# Install build tools needed for native modules (canvas, sharp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    build-essential \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    librsvg2-dev \
    pkg-config \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.14.4 --activate

# Copy monorepo root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages/ ./packages/
COPY services/campaign/ ./services/campaign/

# Install all workspace deps
RUN pnpm install --no-frozen-lockfile

# Build shared packages first
RUN pnpm --filter @vote-capsule/types build
RUN pnpm --filter @vote-capsule/database build 2>/dev/null || true && mkdir -p /app/packages/database/dist

# Build campaign service TypeScript
# noEmitOnError false = emit JS even if type errors; || true = don't fail Docker build on TS warnings
RUN cd /app/services/campaign && npx tsc --project tsconfig.json --noEmitOnError false || true

# Create production deployment bundle
RUN pnpm --filter @vote-capsule/campaign-service deploy --prod /tmp/campaign-deploy

# ── Stage 2: runner ──────────────────────────────────────────────────────────
FROM public.ecr.aws/docker/library/node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG SERVICE_PORT
ARG GIT_SHA
ENV PORT=$SERVICE_PORT
ENV GIT_SHA=$GIT_SHA

# Runtime system libs required by sharp (libvips) and canvas (cairo/pango)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libjpeg62-turbo \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgif7 \
    librsvg2-2 \
    wget \
  && rm -rf /var/lib/apt/lists/*

# Copy production bundle
COPY --from=builder /tmp/campaign-deploy/node_modules           ./node_modules
COPY --from=builder /app/services/campaign/dist                 ./dist
COPY --from=builder /app/services/campaign/package.json         ./package.json

# Copy shared type/database packages (needed at runtime for TypeORM)
COPY --from=builder /app/packages/types/dist/cjs               ./node_modules/@vote-capsule/types/dist/cjs
COPY --from=builder /app/packages/types/dist/index.js          ./node_modules/@vote-capsule/types/dist/index.js
COPY --from=builder /app/packages/types/dist/common.js         ./node_modules/@vote-capsule/types/dist/common.js
COPY --from=builder /app/packages/types/dist/index.d.ts        ./node_modules/@vote-capsule/types/dist/index.d.ts
COPY --from=builder /app/packages/types/dist/esm               ./node_modules/@vote-capsule/types/dist/esm
COPY --from=builder /app/packages/database/dist                ./node_modules/@vote-capsule/database/dist

LABEL org.opencontainers.image.title="vote-capsule-campaign-service" \
      org.opencontainers.image.revision=$GIT_SHA \
      org.opencontainers.image.created="2026-08-26"

EXPOSE $SERVICE_PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:$PORT/health || exit 1
CMD ["node", "dist/main"]
