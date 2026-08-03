# Vote Capsule(tm) -- Geography Service
ARG SERVICE_PORT=3004
ARG GIT_SHA=local

FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9 --silent
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages/ ./packages/
COPY services/geography/ ./services/geography/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @vote-capsule/types build 2>/dev/null || true
RUN pnpm --filter @vote-capsule/database build 2>/dev/null || true && mkdir -p /app/packages/database/dist
# Compile TypeScript — print all output including errors, force emit
RUN cd /app/services/geography \
    && echo "=== TSC INPUT FILES ===" \
    && npx tsc --project tsconfig.json --listFiles 2>&1 | head -20 \
    && echo "=== TSC COMPILE ===" \
    && npx tsc --project tsconfig.json --noEmitOnError false 2>&1 \
    && echo "=== DIST CONTENTS ===" \
    && (ls dist/ 2>/dev/null || echo "dist/ IS EMPTY OR MISSING") \
    && echo "=== CHECK main.js ===" \
    && (test -f dist/main.js && echo "dist/main.js OK" || echo "dist/main.js MISSING - tsc produced no output!")

FROM public.ecr.aws/docker/library/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG SERVICE_PORT
ARG GIT_SHA
ENV PORT=$SERVICE_PORT
ENV GIT_SHA=$GIT_SHA
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/geography/node_modules ./node_modules
COPY --from=builder /app/services/geography/dist ./dist
COPY --from=builder /app/services/geography/package.json ./package.json
COPY --from=builder /app/packages/types/dist/cjs ./node_modules/@vote-capsule/types/dist/cjs
COPY --from=builder /app/packages/types/dist/esm ./node_modules/@vote-capsule/types/dist/esm
EXPOSE $SERVICE_PORT
HEALTHCHECK NONE
CMD ["node", "dist/main"]
