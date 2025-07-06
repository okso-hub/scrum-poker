# ─── 1. Builder ───────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

# 1a) Install deps
COPY server/package*.json ./
RUN npm ci

# 1b) Copy sources & build
COPY server/ ./
RUN npm run build           

# ─── 2. Runtime ───────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

# 2a) Bring in only what we need at runtime
COPY --from=builder /app/dist       ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json  ./

EXPOSE 3000

# 2c) Launch the compiled bundle
CMD ["node", "dist/index.js"]
