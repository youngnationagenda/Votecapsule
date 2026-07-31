# Vote Capsule(tm) -- Geography Service
ARG SERVICE_PORT=3004
ARG GIT_SHA=local

FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9 --silent
COPY package.json pnpm-workspace.yaml tsconfig.base.json turbo.json ./
COPY packages/ ./packages/
COPY services/geography/ ./services/geography/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @vote-capsule/types build 2>/dev/null || true
RUN pnpm --filter @vote-capsule/database build 2>/dev/null || true
RUN pnpm --filter @vote-capsule/geography-service build

FROM public.ecr.aws/docker/library/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG SERVICE_PORT
ARG GIT_SHA
ENV PORT=$SERVICE_PORT
ENV GIT_SHA=$GIT_SHA
# Copy root hoisted node_modules (pnpm workspace deps)
COPY --from=builder /app/node_modules ./node_modules
# Copy service-level node_modules (service-specific deps not hoisted)
COPY --from=builder /app/services/geography/node_modules ./node_modules
COPY --from=builder /app/services/geography/dist ./dist
COPY --from=builder /app/services/geography/package.json ./package.json
COPY --from=builder /app/packages ./packages
EXPOSE $SERVICE_PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:$SERVICE_PORT/health || exit 1
CMD ["node", "dist/main"]
