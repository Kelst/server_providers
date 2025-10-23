FROM node:20-alpine AS base

WORKDIR /app

# Build argument for API URL
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Copy root package.json and workspace configs
COPY package.json ./
COPY tsconfig.base.json ./

# Copy admin package files
COPY packages/admin/package.json ./packages/admin/
COPY packages/admin/tsconfig.json ./packages/admin/
COPY packages/admin/next.config.js ./packages/admin/
COPY packages/admin/postcss.config.js ./packages/admin/
COPY packages/admin/tailwind.config.ts ./packages/admin/
COPY packages/admin/components.json ./packages/admin/

# Install dependencies
RUN npm install --workspace=packages/admin --include-workspace-root

# Copy admin source code (all of src/)
COPY packages/admin/src ./packages/admin/src

# Build with API URL
WORKDIR /app/packages/admin
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy package.json for standalone mode
COPY --from=base /app/packages/admin/package.json ./packages/admin/
COPY --from=base /app/packages/admin/next.config.js ./packages/admin/

# Copy built files
COPY --from=base /app/packages/admin/.next/standalone ./
COPY --from=base /app/packages/admin/.next/static ./packages/admin/.next/static

EXPOSE 3001

ENV PORT=3001

CMD ["node", "packages/admin/server.js"]
