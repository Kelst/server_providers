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
- `security/`: Security features including IP rules, audit logs, and security events
- `notifications/`: Notification system for SMS and Telegram messages
- `health/`: Health checks and system monitoring endpoints
- `websocket/`: Real-time metrics streaming via Socket.IO
- `settings/`: Admin settings management (Telegram bot, rate limits, timeouts)
- `alerts/`: Alert rules and monitoring system with configurable thresholds
- `database/`: Prisma service wrapper (global module)

**Common utilities** (packages/backend/src/common/):
- `guards/scope.guard.ts`: Validates API token scopes
- `guards/endpoint-access.guard.ts`: Blocks access to specific endpoints per token (supports wildcards)
- `guards/rate-limit.guard.ts`: Per-token rate limiting
- `decorators/require-scopes.decorator.ts`: Decorator for requiring specific scopes
- `constants/scopes.constants.ts`: Available scope definitions

**Global interceptors** (packages/backend/src/interceptors/):
- `api-logging.interceptor.ts`: Automatically logs all API token authenticated requests to `ApiRequest` table
  - Only logs requests authenticated with API tokens (not JWT admin requests)
  - Tracks endpoint, method, status, response time, IP, user agent
  - Sanitizes sensitive fields (passwords, tokens, keys) before logging
  - Limits payload size to 10KB (truncates larger payloads)
- `request-timeout.interceptor.ts`: Configurable request timeout (default 30s, configurable via AdminSettings)

**Global guards** (packages/backend/src/guards/):
- `configurable-throttler.guard.ts`: Global rate limiting (default 100 req/min, configurable via AdminSettings)

### Database Schema

Key models in `packages/backend/prisma/schema.prisma`:

**Core models:**
- `User`: Admin users with JWT authentication (roles: ADMIN, SUPER_ADMIN)
- `ApiToken`: API tokens with scopes for external clients (includes rate limiting, expiration)

**Request tracking:**
- `ApiRequest`: Automatic log of all API token requests (via ApiLoggingInterceptor)
- `RateLimit`: Rate limiting tracking per token
- `RateLimitEvent`: Log of rate limit violations
- `AnalyticsSummary`: Pre-aggregated analytics data

**Security models:**
- `IpRule`: IP whitelist/blacklist per token
- `SecurityEvent`: Security incidents (blocked IPs, failed auth, suspicious activity)
- `TokenAuditLog`: Audit trail for all token changes (created, updated, deleted, rotated)
- `TokenRotationHistory`: History of token regenerations
- `EndpointRule`: Block access to specific endpoints per token

**Notification & auth models:**
- `NotificationLog`: SMS and Telegram notification tracking
- `PhoneChangeVerification`: OTP codes for phone number changes
- `PhoneLoginVerification`: OTP codes for phone-based login
- `LoginAttempt`: Brute force protection tracking

**Billing models:**
- `CreditHistory`: Monthly credit usage tracking
- `TariffChangeHistory`: History of tariff plan changes

**Monitoring & alerts models:**
- `AdminSettings`: Admin configuration (Telegram bot, rate limits, timeouts)
- `AlertRule`: Configurable alert rules with thresholds and notification channels
- `Alert`: History of triggered alerts with recovery tracking

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

- **Global rate limiting**: Enforced by `ConfigurableThrottlerGuard` (default 100 req/min, configurable via AdminSettings)
  - In-memory storage with automatic cleanup
  - Per-IP tracking
  - Configurable via `AdminSettings.globalRateLimit`
- **Per-token rate limiting**: Via `ApiToken.rateLimit` field
- **Rate limit violations**: Logged to `RateLimitEvent` table with full context

## Important Patterns

### Automatic Request Logging
All requests authenticated with API tokens are automatically logged via the `ApiLoggingInterceptor` (registered globally in app.module.ts). You don't need to manually log requests - the interceptor:
- Captures request/response data automatically
- Sanitizes sensitive fields before storage
- Records response time, status codes, errors
- Only logs API token requests (not JWT admin requests)

### Scope-Based Access Control
Use the scope system to control access to endpoints:
1. Add `@UseGuards(ApiTokenGuard, ScopeGuard)` to controller/method
2. Add `@RequireScopes(ApiScope.BILLING)` to specify required scopes
3. The ScopeGuard checks if the token has ALL required scopes
4. Multiple scopes can be required: `@RequireScopes(ApiScope.BILLING, ApiScope.ANALYTICS)`

### Security Features
The system includes extensive security features:
- **IP Rules**: Whitelist/blacklist IPs per token (IpRule model)
- **Endpoint Rules**: Block specific endpoints per token (EndpointRule model)
  - Supports wildcards: `*` for single segment, `**` for multiple segments
  - Example: `/api/billing/users/*/payments` blocks all user payment endpoints
  - Enforced by `EndpointAccessGuard`
- **Audit Logging**: All token changes are logged (TokenAuditLog model)
- **Security Events**: Suspicious activity tracking (SecurityEvent model)
- **Token Rotation**: Track token regenerations (TokenRotationHistory model)
- **Brute Force Protection**: Login attempt tracking with rate limiting

### Request Timeouts
All API requests have configurable timeouts:
- Default timeout: 30 seconds
- Configurable per-admin via `AdminSettings.apiRequestTimeout`
- Enforced by `RequestTimeoutInterceptor` (global interceptor)
- Cached for 30 seconds to reduce database load

### Real-Time Monitoring
The system includes WebSocket support for real-time metrics:
- **WebSocket Gateway**: `MetricsGateway` on `/metrics` namespace
- **Admin panel integration**: Live dashboard updates via Socket.IO
- **Metrics**: Request rates, error rates, response times, system health

### Alert System
Configurable alert rules for monitoring:
- **Alert types**: Error rates, response time, CPU/memory/disk usage, database performance, etc.
- **Notification channels**: Telegram, Email, Webhook
- **Severity levels**: INFO, WARNING, CRITICAL, EMERGENCY
- **Cooldown**: Prevents alert spam with configurable cooldown periods
- **Recovery notifications**: Optional alerts when issues are resolved
- **Alert history**: Full tracking in `Alert` model with acknowledgment support

## Admin Panel Architecture

The admin panel is built with **Next.js 14** and modern React patterns:

**Tech Stack:**
- **Next.js 14**: App Router with React Server Components
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Pre-built accessible components (Radix UI primitives)
- **React Query**: Server state management and caching
- **Zustand**: Client state management
- **Socket.IO Client**: Real-time updates
- **Recharts**: Analytics visualizations
- **React Hook Form + Zod**: Form handling and validation

**Key Features:**
- `/dashboard`: Main dashboard with real-time metrics
- `/dashboard/tokens`: Token management with CRUD operations
- `/dashboard/analytics`: Request analytics and visualizations
- `/dashboard/monitoring`: System health and performance metrics
- `/dashboard/security`: Security events and IP rules
- `/dashboard/alerts/rules`: Alert rule configuration
- `/dashboard/alerts/history`: Alert history and acknowledgment
- `/dashboard/settings`: Admin settings (Telegram bot, rate limits, timeouts)
- `/dashboard/audit-logs`: Token audit trail
- **Real-time WebSocket connection**: Live metrics updates without polling
