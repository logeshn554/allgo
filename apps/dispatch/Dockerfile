FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/common ./packages/common
COPY apps/dispatch ./apps/dispatch

RUN npm ci --workspace=@allgo/common --workspace=@allgo/dispatch
RUN npm run build --workspace=@allgo/common
RUN npm run build --workspace=@allgo/dispatch

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages/common ./packages/common
COPY --from=builder /app/apps/dispatch/package*.json ./apps/dispatch/
COPY --from=builder /app/apps/dispatch/dist ./apps/dispatch/dist

EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "apps/dispatch/dist/main.js"]
