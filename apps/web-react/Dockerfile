##### PRUNER
FROM --platform=linux/amd64 node:20-slim AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=web-react --docker

##### BUILDER
FROM --platform=linux/amd64 node:20-slim AS builder
WORKDIR /app

RUN npm install -g pnpm

# 1. Copy manifests & lockfile for caching
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install --frozen-lockfile

# 2. Copy source code & workspace config
COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json

# Copy .env explicitly
COPY apps/web-react/.env ./apps/web-react/.env

# Build configs: bypass ESLint and TS errors during docker compilation
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
ENV ESLINT_IGNORE_DURING_BUILDS=1
ENV TYPESCRIPT_IGNORE_BUILD_ERRORS=1

WORKDIR /app/apps/web-react

# Run next build directly inside the workspace folder
RUN pnpm exec next build

##### RUNNER
FROM --platform=linux/amd64 gcr.io/distroless/nodejs20-debian12 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80

COPY --from=builder /app/apps/web-react/public ./apps/web-react/public
COPY --from=builder /app/apps/web-react/.next/standalone ./
COPY --from=builder /app/apps/web-react/.next/static ./apps/web-react/.next/static

EXPOSE 80

CMD ["apps/web-react/server.js"]