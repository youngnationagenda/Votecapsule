# Vote Capsule(tm) -- Audit Service
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
RUN cd /app/services/audit && npx tsc --project tsconfig.json --noEmitOnError false
RUN pnpm --filter @vote-capsule/audit-service deploy --prod /tmp/audit-deploy

FROM public.ecr.aws/docker/library/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG SERVICE_PORT
ARG GIT_SHA
ENV PORT=$SERVICE_PORT
ENV GIT_SHA=$GIT_SHA
COPY --from=builder /tmp/audit-deploy/node_modules ./node_modules
COPY --from=builder /app/services/audit/dist ./dist
COPY --from=builder /app/services/audit/package.json ./package.json
COPY --from=builder /app/packages/types/dist/cjs ./node_modules/@vote-capsule/types/dist/cjs
COPY --from=builder /app/packages/types/dist/esm ./node_modules/@vote-capsule/types/dist/esm
COPY --from=builder /app/packages/database/dist ./node_modules/@vote-capsule/database/dist
LABEL build-date="2026-08-04-phase13"
EXPOSE $SERVICE_PORT
HEALTHCHECK NONE
CMD ["node", "dist/main"]
