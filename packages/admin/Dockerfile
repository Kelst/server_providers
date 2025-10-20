FROM node:20-alpine AS base

WORKDIR /app

# Copy root package.json and workspace configs
COPY package.json ./
COPY tsconfig.base.json ./

# Copy admin package files
COPY packages/admin/package.json ./packages/admin/
COPY packages/admin/tsconfig.json ./packages/admin/
COPY packages/admin/next.config.js ./packages/admin/
COPY packages/admin/postcss.config.js ./packages/admin/
COPY packages/admin/tailwind.config.ts ./packages/admin/

# Install dependencies
RUN npm install --workspace=packages/admin --include-workspace-root

# Copy admin source code
COPY packages/admin/src ./packages/admin/src

# Build
WORKDIR /app/packages/admin
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy built files
COPY --from=base /app/packages/admin/.next/standalone ./
COPY --from=base /app/packages/admin/.next/static ./.next/static

EXPOSE 3001

ENV PORT=3001

CMD ["node", "packages/admin/server.js"]
