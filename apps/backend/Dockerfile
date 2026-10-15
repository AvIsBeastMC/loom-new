##### PRUNER
FROM --platform=linux/amd64 node:24-slim AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=backend --docker

##### RUNNER
FROM --platform=linux/amd64 node:24-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Kolkata
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

RUN npm install -g pnpm

# 1. Copy only JSON manifests & lockfile for caching
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# 2. Skip postinstall scripts (avoids running prisma generate prematurely)
RUN pnpm install --frozen-lockfile --ignore-scripts

# 3. Copy full source (including apps/backend/prisma/schema.prisma)
COPY --from=pruner /app/out/full/ .

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["sh", "-c", "pnpm run start"]