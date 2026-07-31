# Vote Capsule™ — Admin Portal (ECR Public mirror — no Docker Hub rate limits)
ARG GIT_SHA=local

FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9 --silent

# Copy monorepo root manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./

# Copy shared packages
COPY packages/ ./packages/

# Copy admin-web app
COPY apps/admin-web/ ./apps/admin-web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages first (types must be built before Vite resolves them)
RUN pnpm --filter @vote-capsule/types build 2>/dev/null || true
RUN pnpm --filter @vote-capsule/design-tokens build 2>/dev/null || true

# Build args for Vite env vars
ARG VITE_COGNITO_USER_POOL_ID=us-east-1_i3N2tg34A
ARG VITE_COGNITO_CLIENT_ID=3hi86ci06546ki038k6msmik0s
ARG VITE_AWS_REGION=us-east-1
ARG VITE_API_GATEWAY_URL=https://483uyy43nc.execute-api.us-east-1.amazonaws.com
ARG GIT_SHA
ENV VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID
ENV VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID
ENV VITE_AWS_REGION=$VITE_AWS_REGION
ENV VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL
ENV VITE_APP_VERSION=$GIT_SHA

# Build admin-web (vite build — no tsc pre-check)
RUN pnpm --filter @vote-capsule/admin-web build

# ── Nginx runner ─────────────────────────────────────────────────────────────
FROM public.ecr.aws/docker/library/nginx:alpine AS runner

COPY --from=builder /app/apps/admin-web/dist /usr/share/nginx/html
COPY apps/admin-web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
