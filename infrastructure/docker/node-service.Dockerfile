# Reusable multi-stage Dockerfile for AllGo Node/NestJS services
# Usage:
#   docker build -f infrastructure/docker/node-service.Dockerfile \
#     --build-arg SERVICE_NAME=dispatch --build-arg SERVICE_PORT=8080 .

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS pruner
ARG SERVICE_NAME=dispatch

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

WORKDIR /app
COPY . .
RUN pnpm dlx turbo prune @allgo/${SERVICE_NAME} --docker

FROM node:${NODE_VERSION} AS builder
ARG SERVICE_NAME=dispatch

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@allgo/${SERVICE_NAME}...

FROM node:${NODE_VERSION} AS runner
ARG SERVICE_NAME=dispatch
ARG SERVICE_PORT=8080

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${SERVICE_PORT}
ENV SERVICE_NAME=${SERVICE_NAME}

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/common ./packages/common
COPY --from=builder /app/packages/env ./packages/env
COPY --from=builder /app/services/${SERVICE_NAME}/package.json ./services/${SERVICE_NAME}/
COPY --from=builder /app/services/${SERVICE_NAME}/node_modules ./services/${SERVICE_NAME}/node_modules
COPY --from=builder /app/services/${SERVICE_NAME}/dist ./services/${SERVICE_NAME}/dist

EXPOSE ${SERVICE_PORT}
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["sh", "-c", "node services/${SERVICE_NAME}/dist/main.js"]
