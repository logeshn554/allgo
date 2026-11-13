#!/bin/sh
set -e
export DATABASE_URL="postgresql://postgres:postgres@allgo-postgres:5432/allgo_dev"
export REDIS_URL="redis://allgo-redis:6379"

echo "=== Running Phase 7 Test Suite ==="
node --experimental-transform-types --test tests/backend/phase7-parcel-and-courier.spec.ts
