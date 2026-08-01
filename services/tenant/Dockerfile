# Vote Capsule(tm) -- Tenant Service
ARG SERVICE_PORT=3002
ARG GIT_SHA=local

FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9 --silent
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages/ ./packages/
COPY services/tenant/ ./services/tenant/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @vote-capsule/types build 2>/dev/null || true
RUN pnpm --filter @vote-capsule/database build 2>/dev/null || true && mkdir -p /app/packages/database/dist
RUN pnpm --filter @vote-capsule/tenant-service build
RUN pnpm --filter @vote-capsule/tenant-service deploy --prod /app/deploy/tenant

FROM public.ecr.aws/docker/library/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG SERVICE_PORT
ARG GIT_SHA
ENV PORT=$SERVICE_PORT
ENV GIT_SHA=$GIT_SHA
COPY --from=builder /app/deploy/tenant/node_modules ./node_modules
COPY --from=builder /app/services/tenant/dist ./dist
COPY --from=builder /app/services/tenant/package.json ./package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/packages/types/dist ./node_modules/@vote-capsule/types/dist
COPY --from=builder /app/packages/database/dist ./node_modules/@vote-capsule/database/dist
# Fix pnpm virtual store path for @vote-capsule/types
RUN find ./node_modules/.pnpm -path "*vote-capsule+types*/node_modules/@vote-capsule/types" -type d 2>/dev/null | xargs -I{} cp -r ./node_modules/@vote-capsule/types/dist {}/dist 2>/dev/null || true
EXPOSE $SERVICE_PORT
HEALTHCHECK NONE
CMD ["node", "dist/main"]
