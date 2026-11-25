# Reusable multi-stage Dockerfile for AllGo Next.js web applications
# Usage:
#   docker build -f infrastructure/docker/nextjs-app.Dockerfile \
#     --build-arg APP_NAME=customer-web --build-arg APP_PORT=3004 .

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS pruner
ARG APP_NAME=admin

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

WORKDIR /app
COPY . .
RUN pnpm dlx turbo prune @allgo/${APP_NAME} --docker

FROM node:${NODE_VERSION} AS builder
ARG APP_NAME=admin

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@allgo/${APP_NAME}...

FROM node:${NODE_VERSION} AS runner
ARG APP_NAME=admin
ARG APP_PORT=3003

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${APP_PORT}
ENV APP_NAME=${APP_NAME}

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/${APP_NAME} ./apps/${APP_NAME}

EXPOSE ${APP_PORT}
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/ || exit 1

CMD ["sh", "-c", "pnpm --filter @allgo/${APP_NAME} start"]
