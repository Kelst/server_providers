# Multi-stage build for NestJS Backend
FROM node:20-alpine AS base

# Install OpenSSL for Prisma, build tools for native modules, and FFmpeg for video processing
RUN apk add --no-cache openssl libc6-compat python3 make g++ ffmpeg

WORKDIR /app

# Copy workspace config
COPY package.json tsconfig.base.json ./

# Copy backend package files
COPY packages/backend/package.json ./packages/backend/
COPY packages/backend/tsconfig.json ./packages/backend/
COPY packages/backend/nest-cli.json ./packages/backend/
COPY packages/backend/prisma ./packages/backend/prisma/

# Copy shared package
COPY packages/shared ./packages/shared/

# Install all dependencies
RUN npm install --workspace=packages/backend --include-workspace-root

# Copy source code
COPY packages/backend/src ./packages/backend/src/

# Generate Prisma Client
WORKDIR /app/packages/backend
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

RUN apk add --no-cache openssl libc6-compat python3 make g++ ffmpeg

WORKDIR /app

ENV NODE_ENV=production

# Copy built application
COPY --from=base /app/packages/backend/dist ./dist
COPY --from=base /app/packages/backend/package.json ./package.json
COPY --from=base /app/packages/backend/prisma ./prisma
COPY --from=base /app/node_modules ./node_modules

# Generate Prisma Client for production
RUN npx prisma generate --schema=./prisma/schema.prisma

EXPOSE 3000

CMD ["node", "dist/main.js"]
