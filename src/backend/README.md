# Low Income Year Tax Optimizer Tool - Backend Service

## Project Overview

Enterprise-grade backend service for the Low Income Year Tax Optimizer Tool, providing secure and scalable API endpoints for tax optimization calculations, AI-powered explanations, and user data management.

### Architecture Overview

- **Framework**: NextJS 14.0+ with TypeScript 5.2+
- **Database**: Supabase PostgreSQL with Prisma ORM
- **Authentication**: Supabase Auth with JWT
- **AI Integration**: OpenAI GPT-4 API
- **Email Service**: Resend API
- **Caching**: Vercel KV (Redis)
- **Deployment**: Vercel Edge Network

### System Components

- Authentication & Authorization Service
- Tax Calculation Engine
- AI Explanation System
- Real-time Chat Service
- PDF Report Generator
- Data Export Service

## Getting Started

### System Requirements

- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL >= 15.0
- Git

### Development Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd src/backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Required environment variables:
```
DATABASE_URL=
SUPABASE_URL=
SUPABASE_KEY=
OPENAI_API_KEY=
RESEND_API_KEY=
JWT_SECRET=
NODE_ENV=
API_RATE_LIMIT=
LOG_LEVEL=
CORS_ORIGIN=
```

4. Initialize database:
```bash
npx prisma migrate dev
```

5. Start development server:
```bash
npm run dev
```

## Development Guidelines

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Maintain 100% type safety
- Document all public APIs and functions
- Follow SOLID principles

### Git Workflow

1. Create feature branch from `develop`
2. Follow conventional commits
3. Submit PR for review
4. Require passing tests and lint checks
5. Squash merge to `develop`

### Testing Requirements

- Unit tests: 90% coverage minimum
- Integration tests for all API endpoints
- E2E tests for critical flows
- Performance testing for optimization endpoints
- Security testing for auth flows

## API Documentation

### Authentication

All API endpoints except `/auth/login` and `/auth/register` require JWT authentication.

#### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### API Endpoints

#### Authentication
- POST `/api/auth/login`
- POST `/api/auth/register`
- POST `/api/auth/refresh`

#### Scenarios
- GET `/api/scenarios`
- POST `/api/scenarios`
- GET `/api/scenarios/:id`
- PUT `/api/scenarios/:id`
- DELETE `/api/scenarios/:id`

#### Calculations
- POST `/api/calculate`
- GET `/api/calculate/:id`

#### Chat
- POST `/api/chat/message`
- GET `/api/chat/thread/:id`

#### Explanations
- POST `/api/explain`
- GET `/api/explain/:id`

#### Export
- GET `/api/export/pdf`
- GET `/api/export/csv`

### Rate Limiting

- 100 requests per minute per IP
- 1000 requests per day per user
- Custom limits for computation-heavy endpoints

## Testing Strategy

### Unit Testing

- Jest for unit tests
- Mock external services
- Test all business logic
- Verify edge cases
- Run with `npm test`

### Integration Testing

- Test API endpoints
- Verify database operations
- Test external service integration
- Run with `npm run test:integration`

### E2E Testing

- Critical user flows
- Performance benchmarks
- Security scenarios
- Run with `npm run test:e2e`

## Deployment

### Build Process

1. Lint and test:
```bash
npm run lint && npm test
```

2. Build production assets:
```bash
npm run build
```

3. Deploy to Vercel:
```bash
vercel --prod
```

### Environments

- Development: Local development
- Preview: PR deployments
- Staging: Pre-production testing
- Production: Live environment

### Monitoring

- Vercel Analytics for performance
- Sentry for error tracking
- Custom logging for business metrics
- Health check endpoints

## Troubleshooting

### Common Issues

1. Database Connection
- Verify DATABASE_URL
- Check Supabase status
- Confirm network access

2. Authentication
- Validate JWT token
- Check Supabase Auth status
- Verify user permissions

3. Performance
- Monitor response times
- Check cache hit rates
- Analyze query performance

### Debug Procedures

1. Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

2. Monitor real-time logs:
```bash
vercel logs --follow
```

3. Check system health:
```bash
npm run health-check
```

## Security

### Best Practices

- Regular dependency updates
- Security scanning in CI/CD
- Input validation
- Rate limiting
- Data encryption
- Audit logging

### Incident Response

1. Detect: Monitor security events
2. Contain: Isolate affected systems
3. Eradicate: Remove security threats
4. Recover: Restore normal operation
5. Review: Document and improve

## Project Structure

```
src/
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   └── cache.config.ts
├── controllers/
│   ├── auth.controller.ts
│   └── scenario.controller.ts
├── middleware/
│   ├── auth.middleware.ts
│   └── validation.middleware.ts
├── models/
│   ├── user.model.ts
│   └── scenario.model.ts
├── routes/
│   ├── auth.routes.ts
│   └── api.routes.ts
├── services/
│   ├── calculation.service.ts
│   └── ai.service.ts
├── types/
│   ├── common.types.ts
│   └── api.types.ts
└── utils/
    ├── validation.utils.ts
    └── security.utils.ts
```

## License

Copyright © 2024 Low Income Year Tax Optimizer Tool. All rights reserved.