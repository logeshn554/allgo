# Reusable test-runner image for AllGo CI and local isolated verification
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate \
  && apk add --no-cache git bash

WORKDIR /app
