# Vote Capsule™ Admin Portal — Multi-stage Docker build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile
COPY . .
ARG VITE_COGNITO_USER_POOL_ID=us-east-1_i3N2tg34A
ARG VITE_COGNITO_CLIENT_ID=3hi86ci06546ki038k6msmik0s
ARG VITE_AWS_REGION=us-east-1
ARG VITE_API_GATEWAY_URL=https://483uyy43nc.execute-api.us-east-1.amazonaws.com
RUN pnpm build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
