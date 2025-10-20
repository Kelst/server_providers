# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an API Gateway built with NestJS (backend) and Next.js (admin panel) that provides API token management, request analytics, and a shared API infrastructure. The project uses a monorepo structure with separate packages for backend, admin, and shared code.

**Key Architecture:**
- **Backend (NestJS)**: REST API with dual authentication (JWT for admins, API tokens for clients)
- **Admin (Next.js)**: Admin panel for managing tokens and viewing analytics
- **Shared**: Common types, constants, and utilities
- **Infrastructure**: PostgreSQL (database), Redis (rate limiting), Nginx (reverse proxy)

## Development Commands

### Local Development (Recommended)
```bash
# Install dependencies (run from root)
npm install

# Start PostgreSQL and Redis via Docker
docker-compose up -d postgres redis

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed database with initial admin user
npm run prisma:seed

# Start both backend and admin in dev mode
npm run dev

# Or run individually:
npm run dev:backend  # Backend only (port 3000)
npm run dev:admin    # Admin only (port 3001)
```

### Docker Development
```bash
# Start all services (backend, admin, postgres, redis, nginx)
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down

# Rebuild and restart
npm run docker:rebuild
```

### Testing
```bash
# Backend tests
cd packages/backend
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
npm run test:e2e      # E2e tests
```

### Database Management
```bash
npm run prisma:studio    # Open Prisma Studio GUI
npm run prisma:migrate   # Create new migration
npm run prisma:generate  # Regenerate Prisma Client
npm run prisma:seed      # Seed database
```

### Build
```bash
npm run build           # Build both packages
npm run build:backend   # Backend only
npm run build:admin     # Admin only
```

## Architecture Details

### Authentication System

The backend uses **two authentication strategies**:

1. **JWT Authentication** (for admin users accessing `/api/auth`, `/api/tokens`, `/api/analytics`)
   - Guard: `JwtAuthGuard` (packages/backend/src/modules/auth/guards/jwt-auth.guard.ts)
   - Strategy: `jwt` strategy via passport-jwt
   - Use decorator: `@UseGuards(JwtAuthGuard)`
   - Swagger: `@ApiBearerAuth('JWT-auth')`

2. **API Token Authentication with Scopes** (for external clients)
   - Guard: `ApiTokenGuard` + `ScopeGuard` (packages/backend/src/common/guards/scope.guard.ts)
   - Strategy: `api-token` strategy via passport-http-bearer
   - Use decorators: `@UseGuards(ApiTokenGuard, ScopeGuard)` + `@RequireScopes(...)`
   - Swagger: `@ApiBearerAuth('API-token')`
   - **Scopes control module access**:
     - `billing`: Access to /api/billing/* endpoints
     - `userside`: Access to /api/userside/* endpoints (future)
     - `analytics`: Access to /api/analytics/* endpoints
     - `shared`: Access to /api/shared/* endpoints
   - Tokens can have multiple scopes: `['billing', 'analytics']`

### Module Structure

**Backend modules** (packages/backend/src/modules/):
- `auth/`: JWT authentication for admin users (login, token validation)
- `tokens/`: CRUD operations for API tokens with scopes (requires JWT)
- `analytics/`: Request analytics and statistics (requires JWT)
- `shared-api/`: Public API endpoints (require API token with "shared" scope)
- `billing/`: Billing endpoints including auth and operations (require API token with "billing" scope)
- `database/`: Prisma service wrapper (global module)

**Common utilities** (packages/backend/src/common/):
- `guards/scope.guard.ts`: Validates API token scopes
- `decorators/require-scopes.decorator.ts`: Decorator for requiring specific scopes
- `constants/scopes.constants.ts`: Available scope definitions

### Database Schema

Key models in `packages/backend/prisma/schema.prisma`:
- `User`: Admin users with JWT authentication
- `ApiToken`: API tokens with scopes for external clients (includes rate limiting)
- `ApiRequest`: Log of all API requests (endpoint, method, status, response time)
- `RateLimit`: Rate limiting tracking per token
- `AnalyticsSummary`: Pre-aggregated analytics data

### Configuration

The backend uses `@nestjs/config` with validation:
- Config file: packages/backend/src/config/configuration.ts
- Validation schema: packages/backend/src/config/validation.schema.ts
- Environment variables: `.env` files at root and package levels

### API Documentation

Swagger is configured at packages/backend/src/main.ts:
- Swagger UI available at: http://localhost:3000/api/docs
- Two auth schemes configured: JWT-auth and API-token (with scopes)
- All endpoints prefixed with `/api`

## Adding New Features

### Adding New Endpoints with Scopes

To add endpoints requiring specific scopes:

1. Create controller in appropriate module (e.g., `packages/backend/src/modules/billing/`)
2. Add guards: `@UseGuards(ApiTokenGuard, ScopeGuard)`
3. Add scope requirement: `@RequireScopes(ApiScope.BILLING)` (or multiple scopes)
4. Add Swagger: `@ApiBearerAuth('API-token')`
5. The ApiTokenGuard automatically tracks requests and enforces rate limits

**Example:**
```typescript
import { ApiTokenGuard } from '../auth/guards/api-token.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { ApiScope } from '../../common/constants/scopes.constants';

@Controller('billing')
@UseGuards(ApiTokenGuard, ScopeGuard)
@RequireScopes(ApiScope.BILLING)
export class BillingController {
  // Endpoints here require API token with "billing" scope
}
```

### Adding New Admin Endpoints

To add admin-only endpoints:

1. Create new module in `packages/backend/src/modules/`
2. Add `@UseGuards(JwtAuthGuard)` decorator
3. Add `@ApiBearerAuth('JWT-auth')` for Swagger
4. Import module in app.module.ts

### Creating Tokens with Scopes

When creating API tokens via `/api/tokens` (POST):
- Include `scopes` array in request body: `["billing", "userside"]`
- Tokens can have multiple scopes
- Available scopes defined in `src/common/constants/scopes.constants.ts`

### Database Schema Changes

1. Modify `packages/backend/prisma/schema.prisma`
2. Run `npm run prisma:migrate` to create migration
3. Run `npm run prisma:generate` to update Prisma Client
4. Update seed file if needed: `packages/backend/prisma/seeds/seed.ts`

## Default Credentials

After seeding the database:
- Admin email: admin@example.com
- Admin password: admin123
- Demo API token is printed in console

## Services & Ports

When running with Docker:
- Backend: http://localhost:3000 (API at /api, Swagger at /api/docs)
- Admin: http://localhost:3001
- Nginx: http://localhost:80 (reverse proxy)
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- pgAdmin: http://localhost:5050 (optional, use `docker-compose --profile tools up -d`)

## Rate Limiting

- Global rate limiting via `@nestjs/throttler` (100 requests/minute)
- Per-token rate limiting via `ApiToken.rateLimit` field
- Redis used for distributed rate limit tracking
