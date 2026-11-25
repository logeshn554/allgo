# AllGo Unified Task Runner (Rust-powered just + turbo + biome + melos)
set shell := ["zsh", "-cu"]

default:
  @just --list

# Fast Rust-powered lint, typecheck, and fast tests
check:
  pnpm lint && pnpm typecheck && pnpm test:fast

# Build all Node/Next.js workspaces via Turborepo
build:
  pnpm build

# Lint & format with Biome (Rust)
lint:
  pnpm lint

lint-fix:
  pnpm lint:fix

typecheck:
  pnpm typecheck

test-fast:
  pnpm test:fast

test-all:
  pnpm test

# Flutter workspace orchestration via Melos
flutter-get:
  melos bootstrap

flutter-analyze:
  melos run analyze

flutter-test:
  melos run test

# Docker reusable builds
docker-service name port="8080":
  docker build -f infrastructure/docker/node-service.Dockerfile \
    --build-arg SERVICE_NAME={{name}} \
    --build-arg SERVICE_PORT={{port}} \
    -t allgo-{{name}}:local .

docker-web app port="3003":
  docker build -f infrastructure/docker/nextjs-app.Dockerfile \
    --build-arg APP_NAME={{app}} \
    --build-arg APP_PORT={{port}} \
    -t allgo-{{app}}:local .
