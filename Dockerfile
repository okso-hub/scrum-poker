# 1. Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY . .

# 2. Runtime
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/server ./server
ENV NODE_ENV=production
WORKDIR /app/server
EXPOSE 3000
CMD ["node","index.js"]