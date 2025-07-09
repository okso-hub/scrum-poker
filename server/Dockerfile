# 1. Base image and working dir
FROM node:18-alpine
WORKDIR /usr/src/app

# 2. Copy package files and tsconfig, install deps
COPY package*.json tsconfig.json ./
RUN npm ci

# 3. Copy source & static assets
COPY public ./public
COPY src ./src

# 4. Build TypeScript
RUN npm run build

# 5. Launch
CMD ["node", "dist/index.js"]
