# API Gateway Admin Panel

Modern admin panel for managing API Gateway tokens, analytics, and monitoring.

## Features

- **Authentication** - JWT-based admin login with secure session management
- **API Token Management** - CRUD operations for API tokens with scopes and rate limits
- **Analytics Dashboard** - Real-time charts and statistics
  - Requests over time
  - Top endpoints
  - Error tracking
  - Rate limit monitoring
- **Audit Logs** - Complete history of all token changes
- **Responsive Design** - Works on desktop, tablet, and mobile

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Visualization**: Recharts
- **HTTP Client**: Axios
- **Date Utilities**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running on port 3000

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

The admin panel will be available at http://localhost:3001

### Default Credentials

- Email: `admin@example.com`
- Password: `admin123`

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Authentication routes
│   │   └── login/
│   └── (dashboard)/         # Protected dashboard routes
│       ├── page.tsx         # Main dashboard
│       ├── tokens/          # Token management
│       ├── analytics/       # Detailed analytics
│       └── audit-logs/      # Audit log viewer
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── auth/                # Auth components
│   └── layout/              # Layout components (Sidebar, Header)
├── lib/
│   ├── api/                 # API client functions
│   ├── stores/              # Zustand stores
│   ├── types/               # TypeScript types
│   └── utils.ts             # Utility functions
└── middleware.ts            # Route protection
```

## Available Scripts

```bash
npm run dev          # Start development server (port 3001)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## API Integration

The admin panel communicates with the backend API at `/api/*`:

### Auth Endpoints
- `POST /api/auth/login` - Admin login
- `GET /api/auth/me` - Get current user

### Token Endpoints
- `GET /api/tokens` - List all tokens
- `POST /api/tokens` - Create new token
- `GET /api/tokens/:id` - Get token details
- `PATCH /api/tokens/:id` - Update token
- `DELETE /api/tokens/:id` - Delete token
- `GET /api/tokens/:id/stats` - Token statistics

### Analytics Endpoints
- `GET /api/analytics/dashboard` - Dashboard stats
- `GET /api/analytics/requests-over-time` - Request trends
- `GET /api/analytics/top-endpoints` - Most used endpoints
- `GET /api/analytics/errors` - Error logs
- `GET /api/analytics/rate-limit-events` - Rate limit violations
- `GET /api/analytics/rate-limit-stats` - Rate limit statistics
- `GET /api/analytics/audit-log/:tokenId` - Token audit history

## Features in Detail

### Token Management
- Create tokens with multiple scopes (billing, userside, analytics, shared)
- Configure rate limits (requests per minute)
- Set expiration dates
- Activate/deactivate tokens
- View token statistics and usage

### Analytics
- Real-time dashboard with key metrics
- Interactive charts (Line, Bar, Pie)
- Requests over time (24h, 7d, 30d)
- Top endpoints by traffic
- Error tracking
- Rate limit monitoring

### Audit Logs
- Complete change history for all tokens
- Filter by token or action type
- View changes with before/after values
- Track admin actions with IP and user agent

### Security
- JWT-based authentication
- Protected routes with middleware
- Automatic token refresh
- Session persistence in localStorage

## Development Notes

### Adding New Components

Use shadcn/ui CLI to add components:

```bash
npx shadcn@latest add [component-name]
```

### State Management

The app uses Zustand for state management:
- `authStore` - Authentication state
- `tokensStore` - Token management state

### API Client

All API calls go through the configured axios instance in `lib/api/client.ts` which:
- Automatically adds JWT tokens
- Handles 401 errors
- Provides error handling helpers

## Deployment

### Build for Production

```bash
npm run build
npm run start
```

### Docker

The admin panel can be deployed using Docker:

```bash
docker-compose up -d admin
```

## Troubleshooting

### Cannot connect to backend
- Ensure backend is running on port 3000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`

### Login fails
- Verify backend database is seeded
- Check default credentials: admin@example.com / admin123

### Components not styled correctly
- Ensure Tailwind CSS is properly configured
- Check globals.css has shadcn theme variables

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT
