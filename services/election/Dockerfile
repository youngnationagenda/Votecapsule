# Vote Capsule™ — Election Service
ARG SERVICE_PORT=3011
ARG GIT_SHA=local

FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9 --silent
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages/ ./packages/
COPY services/election/ ./services/election/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @vote-capsule/types build 2>/dev/null || true
RUN pnpm --filter @vote-capsule/election-service build
RUN pnpm --filter @vote-capsule/election-service deploy --prod /app/deploy/election

FROM public.ecr.aws/docker/library/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG SERVICE_PORT
ARG GIT_SHA
ENV PORT=$SERVICE_PORT
ENV GIT_SHA=$GIT_SHA
COPY --from=builder /app/deploy/election/node_modules ./node_modules
COPY --from=builder /app/services/election/dist ./dist
COPY --from=builder /app/services/election/package.json ./package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/packages/types/dist ./node_modules/@vote-capsule/types/dist
COPY --from=builder /app/packages/database/dist ./node_modules/@vote-capsule/database/dist
EXPOSE $SERVICE_PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:$SERVICE_PORT/health || exit 1
CMD ["node", "dist/main"]
