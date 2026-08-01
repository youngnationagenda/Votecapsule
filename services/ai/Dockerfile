# Vote Capsule(tm) -- AI Service
ARG SERVICE_PORT=3006
ARG GIT_SHA=local

FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9 --silent
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages/ ./packages/
COPY services/ai/ ./services/ai/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @vote-capsule/types build 2>/dev/null || true
RUN pnpm --filter @vote-capsule/database build 2>/dev/null || true
RUN pnpm --filter @vote-capsule/ai-service build
RUN pnpm --filter @vote-capsule/ai-service deploy --prod /app/deploy/ai

FROM public.ecr.aws/docker/library/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG SERVICE_PORT
ARG GIT_SHA
ENV PORT=$SERVICE_PORT
ENV GIT_SHA=$GIT_SHA
COPY --from=builder /app/deploy/ai/node_modules ./node_modules
COPY --from=builder /app/services/ai/dist ./dist
COPY --from=builder /app/services/ai/package.json ./package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/packages/types/dist ./node_modules/@vote-capsule/types/dist
EXPOSE $SERVICE_PORT
HEALTHCHECK NONE
CMD ["node", "dist/main"]
