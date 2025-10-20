# Billing Module Documentation

## Overview

Billing module provides integration with Abills MySQL database for user authentication and billing operations. All billing endpoints require API token authentication with `billing` scope.

## Database Connection

### Abills MySQL Configuration

Connection details are configured via environment variables:

```env
ABILLS_DB_HOST=194.8.147.140
ABILLS_DB_USER=abills
ABILLS_DB_PASSWORD=abills
ABILLS_DB_NAME=abills
ABILLS_DB_DECODE_KEY=test12345678901234567890
```

### MySQL Service

The `MySQLService` (`packages/backend/src/modules/billing/mysql.service.ts`) provides:
- Connection pool management (100 connections)
- Query execution with prepared statements
- Automatic error handling and logging

**Usage Example:**
```typescript
const sql = `SELECT id, uid FROM users WHERE id = ?`;
const results = await this.mysqlService.query<User[]>(sql, [userId]);
```

**Important:** Always use prepared statements (parameterized queries) to prevent SQL injection.

## Authentication

### Endpoint: `/api/billing/auth/login`

Authenticates user against Abills database using MySQL DECODE function for password decryption.

**Request:**
```typescript
POST /api/billing/auth/login
Headers:
  Content-Type: application/json
  Authorization: Bearer {API_TOKEN_WITH_BILLING_SCOPE}

Body:
{
  "login": "vlad_b_1",      // User login from Abills
  "password": "V1234567"     // Plain text password
}
```

**SQL Query Used:**
```sql
SELECT id, DECODE(password, 'test12345678901234567890') as password, uid
FROM users
WHERE id = ?
```

**Response (Success):**
```json
{
  "success": true,
  "uid": 140278,
  "login": "vlad_b_1",
  "message": "Successfully authenticated"
}
```

**Response (Error):**
```json
{
  "message": "Invalid credentials",
  "error": "Unauthorized",
  "statusCode": 401
}
```

**Important Notes:**
- Password is stored encrypted in Abills database
- `DECODE()` function decrypts password using `ABILLS_DB_DECODE_KEY`
- The decrypted password may be a Buffer, always convert to string and trim
- Response includes `uid` which is required for all subsequent billing operations

## Response Format Standards

### Success Response Structure

All billing endpoints should follow this structure:

```typescript
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "message": "Operation completed successfully"
}
```

For authentication specifically:
```typescript
{
  "success": boolean,
  "uid": number,           // User ID from Abills
  "login": string,         // User login
  "message": string
}
```

### Error Response Structure

NestJS automatically formats errors:

```typescript
{
  "message": string | string[],
  "error": string,              // Error type (e.g., "Unauthorized", "Bad Request")
  "statusCode": number          // HTTP status code
}
```

## Creating New Billing Endpoints

### Step-by-Step Guide

#### 1. Define DTO (Data Transfer Objects)

Create DTOs in `packages/backend/src/modules/billing/dto/`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

// Request DTO example
export class YourRequestDto {
  @ApiProperty({
    description: 'User ID from Abills database',
    example: 140278,
  })
  @IsNumber()
  @IsNotEmpty()
  uid: number;

  // Add your fields here
}

// Response DTO example
export class YourResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 140278 })
  uid: number;

  // Add your response fields here

  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
}
```

#### 2. Add Method to BillingService

In `packages/backend/src/modules/billing/billing.service.ts`:

```typescript
async getBalance(uid: number): Promise<BalanceResponseDto> {
  try {
    // Query Abills database with your actual SQL
    const sql = `SELECT /* your fields */ FROM /* your table */ WHERE uid = ?`;
    const results = await this.mysqlService.query<any[]>(sql, [uid]);

    if (!results || results.length === 0) {
      throw new NotFoundException(`User with uid ${uid} not found`);
    }

    const data = results[0];

    this.logger.log(`Balance retrieved for uid ${uid}`);

    return {
      success: true,
      uid,
      // ... your response data
      message: 'Balance retrieved successfully',
    };
  } catch (error) {
    this.logger.error(`Error getting balance for uid ${uid}:`, error);
    throw error;
  }
}
```

#### 3. Add Controller Endpoint

In `packages/backend/src/modules/billing/billing.controller.ts`:

```typescript
@Get('your-endpoint')
@ApiOperation({
  summary: 'Your endpoint summary',
  description: 'Detailed description. Requires uid from login response.',
})
@ApiQuery({
  name: 'uid',
  required: true,
  description: 'User ID from Abills',
  type: Number,
  example: 140278,
})
@ApiResponse({
  status: 200,
  description: 'Operation successful',
  type: YourResponseDto,
})
@ApiResponse({
  status: 404,
  description: 'Resource not found',
})
async yourEndpoint(@Query('uid') uid: string): Promise<YourResponseDto> {
  return this.billingService.yourMethod(parseInt(uid, 10));
}
```

## Common Patterns

### 1. Password Handling

Always handle Buffer to String conversion for decrypted passwords:

```typescript
const dbPassword = Buffer.isBuffer(user.password)
  ? user.password.toString('utf8')
  : String(user.password || '').trim();

const inputPassword = String(password).trim();
```

### 2. UID Parameter

All billing endpoints (except login) must accept `uid` as parameter:
- For GET requests: use `@Query('uid')`
- For POST/PATCH requests: include in body DTO

### 3. Error Handling

```typescript
try {
  // Database operation
  const results = await this.mysqlService.query(sql, params);

  if (!results || results.length === 0) {
    throw new NotFoundException('Resource not found');
  }

  // Process results
} catch (error) {
  this.logger.error(`Error description:`, error);
  throw error; // Let NestJS handle the error response
}
```

### 4. Logging

Use structured logging with context:

```typescript
this.logger.log(`Operation completed for uid ${uid}`);
this.logger.warn(`Warning: Something unexpected - uid ${uid}`);
this.logger.error(`Error in operation:`, error);
```

## Security Considerations

### 1. API Token Authentication

All billing endpoints are protected by:
- `@UseGuards(ApiTokenGuard, ScopeGuard)`
- `@RequireScopes(ApiScope.BILLING)`
- `@ApiBearerAuth('API-token')`

These are applied at controller level.

### 2. SQL Injection Prevention

**Always use prepared statements:**

✅ **Correct:**
```typescript
const sql = `SELECT * FROM users WHERE id = ?`;
const results = await this.mysqlService.query(sql, [userId]);
```

❌ **Wrong:**
```typescript
const sql = `SELECT * FROM users WHERE id = '${userId}'`;
const results = await this.mysqlService.query(sql);
```

### 3. Input Validation

Use DTOs with class-validator decorators:
- `@IsString()`, `@IsNumber()`, `@IsEmail()`, etc.
- `@IsNotEmpty()` for required fields
- `@IsOptional()` for optional fields
- Custom validators for complex validation

## Testing Endpoints

### 1. Get API Token with Billing Scope

```bash
# Login as admin
curl -X POST 'http://localhost:3000/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Create billing token
curl -X POST 'http://localhost:3000/api/tokens' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer {ADMIN_JWT_TOKEN}' \
  -d '{
    "projectName":"Billing Access",
    "description":"Access to billing endpoints",
    "scopes":["billing"],
    "rateLimit":100
  }'
```

### 2. Test Billing Login

```bash
curl -X POST 'http://localhost:3000/api/billing/auth/login' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer {BILLING_API_TOKEN}' \
  -d '{
    "login":"vlad_b_1",
    "password":"V1234567"
  }'
```

### 3. Test Other Endpoints

```bash
curl -X GET 'http://localhost:3000/api/billing/your-endpoint?uid=140278' \
  -H 'Authorization: Bearer {BILLING_API_TOKEN}'
```

## Swagger Documentation

All endpoints are automatically documented at: `http://localhost:3000/api/docs`

Make sure to:
1. Use `@ApiTags('billing')` on controller
2. Add `@ApiOperation()` with summary and description
3. Use `@ApiResponse()` for all possible responses
4. Define response types with DTOs
5. Use `@ApiQuery()` or `@ApiBody()` for request parameters

## Database Schema Reference

Refer to Abills database documentation for table structures and available fields.

## File Structure

```
packages/backend/src/modules/billing/
├── dto/
│   ├── billing-auth.dto.ts          # Authentication DTOs
│   └── [other-endpoint].dto.ts      # Other endpoint DTOs
├── billing.controller.ts             # HTTP endpoints
├── billing.service.ts                # Business logic
├── billing.module.ts                 # Module definition
└── mysql.service.ts                  # MySQL connection pool
```

## Troubleshooting

### Issue: Password comparison fails

- Check `ABILLS_DB_DECODE_KEY` matches Abills configuration
- Verify password is converted from Buffer to string
- Check for trailing/leading spaces with `.trim()`

### Issue: Connection timeout

- Verify `ABILLS_DB_HOST` is accessible from Docker container
- Check firewall rules
- Verify MySQL credentials

### Issue: SQL errors

- Always use prepared statements
- Check column names in Abills database
- Use `this.logger.log()` to debug query results

## Best Practices

1. **Always return uid in responses** - Client needs it for subsequent requests
2. **Use TypeScript interfaces** - Define result types for SQL queries
3. **Log important operations** - Helps with debugging and auditing
4. **Handle edge cases** - Empty results, invalid data types, etc.
5. **Keep DTOs synchronized** - Request and Response DTOs should match actual data
6. **Document SQL queries** - Add comments explaining complex queries
7. **Test with real data** - Use actual Abills database for testing
8. **Follow naming conventions** - Use descriptive names for methods and variables

## Example: Complete Endpoint Implementation

See `packages/backend/src/modules/billing/billing.service.ts` lines 30-87 for the complete authentication implementation as reference.

---

**Last Updated:** 2025-10-15
**Version:** 1.0.0
