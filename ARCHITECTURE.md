# Microservices Demo — Architecture Design

**Tech Stack:** Nuxt 4 + NestJS (7 Services)
**Purpose:** Production-grade microservices platform demonstrating enterprise architecture patterns
**Author:** Faiz Khairi
**Date:** 2026-02-15

---

## Executive Summary

A **7-service microservices architecture** showcasing:
- **API Gateway pattern** — Single entry point with routing, rate limiting, authentication
- **Service decomposition** — Domain-driven design with clear service boundaries
- **Database per service** — Each service owns its data (PostgreSQL per service)
- **Message-driven architecture** — Async processing with BullMQ + Redis
- **JWT authentication** — Secure inter-service communication
- **Docker orchestration** — Multi-container local development environment
- **Modern stack** — Nuxt 4, NestJS, Prisma ORM, PostgreSQL, Redis

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Nuxt 4)                        │
│                     Port 3000 - Vue 3 + Tailwind                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (NestJS)                         │
│                Port 4000 - Routing, Auth, Rate Limiting          │
└──┬──────────┬──────────┬──────────┬──────────┬──────────────────┘
   │          │          │          │          │
   │ HTTP     │ HTTP     │ HTTP     │ HTTP     │ HTTP
   ▼          ▼          ▼          ▼          ▼
┌─────┐  ┌────────┐  ┌──────┐  ┌──────────────┐  ┌──────────────┐
│AUTH │  │ USER   │  │TASK  │  │NOTIFICATION  │  │QUEUE WORKER  │
│SVC  │  │SERVICE │  │SVC   │  │SERVICE       │  │(BullMQ)      │
│4001 │  │  4002  │  │4003  │  │    4004      │  │Background    │
└─────┘  └────────┘  └──────┘  └──────────────┘  └──────────────┘
   │          │          │          │                    ▲
   │          │          │          │                    │
   ▼          ▼          ▼          ▼                    │
┌─────┐  ┌────────┐  ┌──────┐  ┌──────────────┐         │
│Auth  │  │User    │  │Task  │  │Notification  │         │
│DB    │  │DB      │  │DB    │  │DB            │         │
│PG    │  │PG      │  │PG    │  │PG            │         │
└─────┘  └────────┘  └──────┘  └──────────────┘         │
                                                          │
┌─────────────────────────────────────────────────────────┘
│                    REDIS (Message Queue)
│              BullMQ for async job processing
└────────────────────────────────────────────────────────────────┘
```

---

## Service Breakdown

### 1. **Frontend (Nuxt 4)** — Port 3000
**Responsibility:** User-facing web application

**Tech Stack:**
- Nuxt 4 (Vue 3 + SSR)
- Shadcn-vue components
- Tailwind CSS
- Pinia (state management)
- Axios (HTTP client with JWT interceptor)

**Features:**
- Authentication UI (login, register, forgot password)
- Dashboard with task management
- User profile management
- Notification center
- Real-time status updates (polling)

**Environment Variables:**
```env
API_GATEWAY_URL=http://localhost:4000
```

---

### 2. **API Gateway (NestJS)** — Port 4000
**Responsibility:** Single entry point for all client requests

**Tech Stack:**
- NestJS with Express
- JWT authentication middleware
- Rate limiting (@nestjs/throttler)
- Proxy to downstream services (http-proxy-middleware)

**Features:**
- Route-based service proxying
  - `/auth/*` → Auth Service (4001)
  - `/users/*` → User Service (4002)
  - `/tasks/*` → Task Service (4003)
  - `/notifications/*` → Notification Service (4004)
- JWT token validation (verify token before proxying)
- Rate limiting (100 req/min per IP)
- Request logging with correlation IDs
- CORS configuration
- Health check endpoint (`/health`)

**Routing Table:**
```typescript
{
  '/auth/*': 'http://auth-service:4001',
  '/users/*': 'http://user-service:4002',
  '/tasks/*': 'http://task-service:4003',
  '/notifications/*': 'http://notification-service:4004'
}
```

**Environment Variables:**
```env
JWT_SECRET=your-secret-key
AUTH_SERVICE_URL=http://auth-service:4001
USER_SERVICE_URL=http://user-service:4002
TASK_SERVICE_URL=http://task-service:4003
NOTIFICATION_SERVICE_URL=http://notification-service:4004
```

---

### 3. **Auth Service (NestJS)** — Port 4001
**Responsibility:** Authentication and JWT token management

**Tech Stack:**
- NestJS with Passport + JWT
- Prisma ORM
- PostgreSQL (auth_db)
- bcrypt for password hashing

**Database Schema:**
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

**API Endpoints:**
- `POST /auth/register` — Create new user (password → bcrypt hash)
- `POST /auth/login` — Email + password → JWT access token (15min) + refresh token (7d)
- `POST /auth/refresh` — Refresh token → new access token
- `POST /auth/logout` — Invalidate refresh token
- `GET /auth/me` — Get current user from JWT (protected)

**Token Structure:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Environment Variables:**
```env
DATABASE_URL=postgresql://postgres:postgres@auth-db:5432/auth_db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

---

### 4. **User Service (NestJS)** — Port 4002
**Responsibility:** User profile and account management

**Tech Stack:**
- NestJS
- Prisma ORM
- PostgreSQL (user_db)

**Database Schema:**
```prisma
model UserProfile {
  id        String   @id @default(uuid())
  userId    String   @unique  // Links to Auth Service user ID
  name      String?
  bio       String?
  avatar    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**API Endpoints:**
- `GET /users/:id` — Get user profile (protected)
- `PATCH /users/:id` — Update user profile (protected, owner only)
- `GET /users` — List users with pagination (protected, admin only)
- `DELETE /users/:id` — Soft delete user (protected, admin only)

**Authorization:**
- All endpoints require valid JWT token
- Extract `userId` from JWT token
- Owner-only endpoints: `req.user.userId === params.id`

**Environment Variables:**
```env
DATABASE_URL=postgresql://postgres:postgres@user-db:5432/user_db
JWT_SECRET=your-secret-key
```

---

### 5. **Task Service (NestJS)** — Port 4003
**Responsibility:** Task management and business logic

**Tech Stack:**
- NestJS
- Prisma ORM
- PostgreSQL (task_db)
- BullMQ client (publish jobs to queue)

**Database Schema:**
```prisma
model Task {
  id          String   @id @default(uuid())
  userId      String   // Owner of the task
  title       String
  description String?
  status      TaskStatus @default(PENDING)
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

**API Endpoints:**
- `POST /tasks` — Create task (protected, queues welcome email)
- `GET /tasks` — List user's tasks with filtering/pagination (protected)
- `GET /tasks/:id` — Get task details (protected, owner only)
- `PATCH /tasks/:id` — Update task (protected, owner only)
- `DELETE /tasks/:id` — Delete task (protected, owner only)

**Business Logic:**
- When task is created → publish `task.created` job to BullMQ → Queue Worker sends notification
- When task status → `COMPLETED` → publish `task.completed` job → Queue Worker logs completion

**Environment Variables:**
```env
DATABASE_URL=postgresql://postgres:postgres@task-db:5432/task_db
JWT_SECRET=your-secret-key
REDIS_HOST=redis
REDIS_PORT=6379
```

---

### 6. **Notification Service (NestJS)** — Port 4004
**Responsibility:** Multi-channel notifications (email, in-app)

**Tech Stack:**
- NestJS
- Prisma ORM
- PostgreSQL (notification_db)
- Nodemailer (SMTP)
- Mailpit (dev email testing)

**Database Schema:**
```prisma
model Notification {
  id        String   @id @default(uuid())
  userId    String
  type      NotificationType
  channel   NotificationChannel
  subject   String?
  message   String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}

enum NotificationType {
  INFO
  SUCCESS
  WARNING
  ERROR
}

enum NotificationChannel {
  EMAIL
  IN_APP
}
```

**API Endpoints:**
- `POST /notifications/send` — Send notification (internal service-to-service only)
- `GET /notifications` — Get user's notifications (protected)
- `PATCH /notifications/:id/read` — Mark as read (protected)
- `DELETE /notifications/:id` — Delete notification (protected)

**Email Templates:**
- `task-created.hbs` — Welcome email when user creates first task
- `task-completed.hbs` — Congratulations email
- `password-reset.hbs` — Password reset link

**Environment Variables:**
```env
DATABASE_URL=postgresql://postgres:postgres@notification-db:5432/notification_db
JWT_SECRET=your-secret-key
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
```

---

### 7. **Queue Worker (NestJS)** — Background Process
**Responsibility:** Async job processing with BullMQ

**Tech Stack:**
- NestJS
- BullMQ (job queue)
- Redis (message broker)
- Axios (HTTP client for calling Notification Service)

**Job Queues:**
1. **`task.created`** — Send welcome notification when user creates first task
2. **`task.completed`** — Send congratulations notification
3. **`email.send`** — Generic email sending job

**Job Processor:**
```typescript
@Processor('task')
export class TaskProcessor {
  @Process('task.created')
  async handleTaskCreated(job: Job<{ userId: string; taskId: string }>) {
    // Call Notification Service to send email
    await axios.post('http://notification-service:4004/notifications/send', {
      userId: job.data.userId,
      type: 'INFO',
      channel: 'EMAIL',
      subject: 'New Task Created',
      message: `Your task ${job.data.taskId} has been created!`
    });
  }
}
```

**Environment Variables:**
```env
REDIS_HOST=redis
REDIS_PORT=6379
NOTIFICATION_SERVICE_URL=http://notification-service:4004
```

---

## Infrastructure

### Docker Compose Services

```yaml
services:
  # Frontend
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - API_GATEWAY_URL=http://api-gateway:4000

  # API Gateway
  api-gateway:
    build: ./services/api-gateway
    ports: ["4000:4000"]
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - AUTH_SERVICE_URL=http://auth-service:4001
      - USER_SERVICE_URL=http://user-service:4002
      - TASK_SERVICE_URL=http://task-service:4003
      - NOTIFICATION_SERVICE_URL=http://notification-service:4004

  # Auth Service
  auth-service:
    build: ./services/auth-service
    ports: ["4001:4001"]
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@auth-db:5432/auth_db
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - auth-db

  # User Service
  user-service:
    build: ./services/user-service
    ports: ["4002:4002"]
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@user-db:5432/user_db
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - user-db

  # Task Service
  task-service:
    build: ./services/task-service
    ports: ["4003:4003"]
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@task-db:5432/task_db
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_HOST=redis
    depends_on:
      - task-db
      - redis

  # Notification Service
  notification-service:
    build: ./services/notification-service
    ports: ["4004:4004"]
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@notification-db:5432/notification_db
      - JWT_SECRET=${JWT_SECRET}
      - SMTP_HOST=mailpit
      - SMTP_PORT=1025
    depends_on:
      - notification-db
      - mailpit

  # Queue Worker
  queue-worker:
    build: ./services/queue-worker
    environment:
      - REDIS_HOST=redis
      - NOTIFICATION_SERVICE_URL=http://notification-service:4004
    depends_on:
      - redis

  # Databases (one per service)
  auth-db:
    image: postgres:16
    environment:
      POSTGRES_DB: auth_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - auth-db-data:/var/lib/postgresql/data

  user-db:
    image: postgres:16
    environment:
      POSTGRES_DB: user_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - user-db-data:/var/lib/postgresql/data

  task-db:
    image: postgres:16
    environment:
      POSTGRES_DB: task_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - task-db-data:/var/lib/postgresql/data

  notification-db:
    image: postgres:16
    environment:
      POSTGRES_DB: notification_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - notification-db-data:/var/lib/postgresql/data

  # Redis (message queue)
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  # Mailpit (email testing)
  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI

volumes:
  auth-db-data:
  user-db-data:
  task-db-data:
  notification-db-data:
```

---

## Repository Structure

```
microservices-demo/
├── frontend/                     # Nuxt 4 application
│   ├── app/
│   │   ├── pages/
│   │   │   ├── index.vue         # Landing page
│   │   │   ├── login.vue
│   │   │   ├── register.vue
│   │   │   └── dashboard/
│   │   │       ├── index.vue     # Task list
│   │   │       ├── tasks/[id].vue
│   │   │       └── profile.vue
│   │   ├── components/
│   │   │   └── ui/               # Shadcn-vue components
│   │   └── layouts/
│   ├── stores/
│   │   ├── auth.ts               # Pinia auth store
│   │   └── tasks.ts
│   ├── services/
│   │   └── api.ts                # Axios client with JWT interceptor
│   ├── nuxt.config.ts
│   ├── tailwind.config.ts
│   └── Dockerfile
│
├── services/
│   ├── api-gateway/              # NestJS API Gateway
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── gateway/
│   │   │   │   ├── gateway.controller.ts
│   │   │   │   └── gateway.service.ts
│   │   │   ├── auth/
│   │   │   │   └── jwt-auth.guard.ts
│   │   │   └── config/
│   │   │       └── proxy.config.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── auth-service/             # Authentication
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── dto/
│   │   │   ├── users/
│   │   │   │   └── users.service.ts
│   │   │   └── prisma/
│   │   │       └── prisma.service.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── user-service/             # User profiles
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── users/
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── dto/
│   │   │   └── prisma/
│   │   ├── prisma/schema.prisma
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── task-service/             # Task management
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── tasks/
│   │   │   │   ├── tasks.controller.ts
│   │   │   │   ├── tasks.service.ts
│   │   │   │   └── dto/
│   │   │   ├── queue/
│   │   │   │   └── task-queue.service.ts
│   │   │   └── prisma/
│   │   ├── prisma/schema.prisma
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── notification-service/     # Notifications + Email
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── notifications/
│   │   │   │   ├── notifications.controller.ts
│   │   │   │   ├── notifications.service.ts
│   │   │   │   └── dto/
│   │   │   ├── email/
│   │   │   │   ├── email.service.ts
│   │   │   │   └── templates/  # Handlebars templates
│   │   │   └── prisma/
│   │   ├── prisma/schema.prisma
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── queue-worker/             # BullMQ background worker
│       ├── src/
│       │   ├── app.module.ts
│       │   ├── processors/
│       │   │   ├── task.processor.ts
│       │   │   └── email.processor.ts
│       │   └── config/
│       │       └── bull.config.ts
│       ├── Dockerfile
│       └── package.json
│
├── docker-compose.yml            # Full stack orchestration
├── .env.example
├── README.md
├── ARCHITECTURE.md               # This file
└── .github/
    └── workflows/
        └── ci.yml                # Build all services
```

---

## Technology Choices

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Nuxt 4 | SSR + Vue 3 + modern DX, matches boilerplate |
| **Backend** | NestJS | Enterprise-grade Node.js framework, TypeScript-first, modular architecture |
| **Database** | PostgreSQL 16 | Production-grade relational DB, one per service (microservices pattern) |
| **ORM** | Prisma | Type-safe, auto-migrations, consistent with boilerplates |
| **Message Queue** | BullMQ + Redis | Industry-standard job queue for Node.js, used in production projects |
| **Auth** | JWT (Passport) | Stateless authentication, secure inter-service communication |
| **Email** | Nodemailer + Mailpit | SMTP-agnostic, Mailpit for dev testing (same as boilerplates) |
| **UI** | Shadcn-vue + Tailwind | Consistent with boilerplates, production-ready components |
| **State** | Pinia | Official Vue state management |
| **Containerization** | Docker + Docker Compose | Multi-service orchestration, production-ready |
| **CI/CD** | GitHub Actions | Automated build validation |

---

## Data Flow Examples

### 1. User Registration Flow
```
1. User submits registration form (frontend)
   ↓
2. POST /auth/register → API Gateway
   ↓
3. API Gateway proxies → Auth Service
   ↓
4. Auth Service:
   - Validates email uniqueness
   - Hashes password with bcrypt
   - Creates user in auth_db
   - Returns success
   ↓
5. Frontend redirects to login
```

### 2. Create Task Flow (with async notification)
```
1. User creates task (frontend)
   ↓
2. POST /tasks → API Gateway
   ↓
3. API Gateway:
   - Validates JWT token
   - Extracts userId from token
   - Proxies → Task Service
   ↓
4. Task Service:
   - Creates task in task_db
   - Publishes "task.created" job to BullMQ
   - Returns task to frontend
   ↓
5. Queue Worker (background):
   - Picks up "task.created" job from Redis
   - Calls Notification Service via HTTP
   ↓
6. Notification Service:
   - Creates in-app notification in notification_db
   - Sends email via Nodemailer → Mailpit
```

### 3. Get User Profile Flow
```
1. User visits profile page (frontend)
   ↓
2. GET /users/:id → API Gateway (with JWT in Authorization header)
   ↓
3. API Gateway:
   - Validates JWT token
   - Proxies → User Service
   ↓
4. User Service:
   - Verifies ownership (JWT userId === params.id)
   - Queries user_db
   - Returns profile data
   ↓
5. Frontend renders profile
```

---

## Security Considerations

### Authentication
- **JWT tokens** with 15-minute expiration
- **Refresh tokens** stored in auth_db with 7-day expiration
- **Bcrypt** password hashing (salt rounds: 10)
- **Token validation** at API Gateway (all protected routes)

### Authorization
- **Owner-only access** for user profiles and tasks (JWT userId check)
- **Admin role** for user listing endpoint (future enhancement)

### Inter-Service Communication
- **JWT propagation** from API Gateway to downstream services
- Services validate JWT independently (shared secret)
- **Service-to-service auth** via internal JWT tokens (future enhancement)

### Rate Limiting
- **100 requests/minute** per IP at API Gateway
- Prevents brute-force attacks on login endpoint

### CORS
- Frontend origin whitelisted at API Gateway
- Credentials allowed for cookie-based sessions (future enhancement)

---

## Deployment Strategy

### Development (Local)
```bash
docker compose up
```
- All 7 services + 4 databases + Redis + Mailpit
- Frontend: http://localhost:3000
- API Gateway: http://localhost:4000
- Mailpit UI: http://localhost:8025

### Staging (Cloud)
- **Frontend:** Netlify (SSR with Nitro)
- **API Gateway + Services:** AWS EC2 with Docker Compose
- **Databases:** AWS RDS PostgreSQL (managed)
- **Redis:** AWS ElastiCache
- **Email:** Any SMTP provider (Resend, Mailgun, SendGrid)

### Production (Enterprise)
- **Frontend:** Netlify or self-hosted with Nginx
- **Services:** Kubernetes (EKS) with one deployment per service
- **Databases:** RDS Multi-AZ with automated backups
- **Redis:** ElastiCache with replication
- **Monitoring:** CloudWatch, Prometheus + Grafana
- **Secrets:** AWS Secrets Manager

---

## Testing Strategy

### Unit Tests
- Each service has Jest tests for business logic
- Target: 80% code coverage

### Integration Tests
- API endpoint tests with Supertest
- Database integration with Testcontainers

### E2E Tests
- Playwright tests for critical user flows:
  - User registration → login → create task → view dashboard
  - Task completion → notification received

### Load Tests
- k6 or Artillery for API Gateway performance testing
- Target: 1000 RPS with <100ms p95 latency

---

## Monitoring & Observability

### Logging
- **Structured logging** with Winston or Pino
- **Correlation IDs** across services (via request headers)
- **Log aggregation** with CloudWatch or ELK stack

### Metrics
- **Prometheus** for service metrics (request count, latency, error rate)
- **Grafana** dashboards for visualization

### Health Checks
- `/health` endpoint on every service
- Docker Compose health checks
- Kubernetes liveness/readiness probes

### Tracing
- OpenTelemetry for distributed tracing (future enhancement)

---

## Future Enhancements

1. **GraphQL Federation** — Replace REST with GraphQL gateway
2. **Event Sourcing** — Audit trail with event store (EventStoreDB)
3. **CQRS** — Separate read/write models for tasks
4. **Service Mesh** — Istio for advanced traffic management
5. **Real-time Updates** — WebSockets for live notifications
6. **Admin Dashboard** — Separate admin UI for user/task management
7. **Multi-Tenancy** — Tenant isolation at database level
8. **Advanced RBAC** — Fine-grained permissions (Casbin or OPA)

---

## Success Metrics

This demo showcases:
- ✅ Microservices architecture (7 services, clear boundaries)
- ✅ Database per service pattern (4 PostgreSQL instances)
- ✅ API Gateway pattern (centralized routing, auth, rate limiting)
- ✅ Message-driven architecture (BullMQ + Redis)
- ✅ JWT authentication (stateless, secure)
- ✅ Modern stack (Nuxt 4, NestJS, Prisma, PostgreSQL)
- ✅ Docker orchestration (12-container local environment)
- ✅ Production-ready patterns (error handling, logging, health checks)
- ✅ CI/CD pipeline (GitHub Actions)

**Comparison to production work:**
- Production: 7 services, 9 external integrations
- Demo: 7 services, internal-only (no external dependencies)
- Both: Message queue (BullMQ), multi-DB, Docker, CI/CD on AWS

---

## Timeline Estimate

| Phase | Tasks | Effort |
|-------|-------|--------|
| **Phase 1** | Project setup, monorepo structure, Docker Compose base | 1 hour |
| **Phase 2** | Auth Service (JWT + Prisma + endpoints) | 2 hours |
| **Phase 3** | User Service (CRUD + auth integration) | 1.5 hours |
| **Phase 4** | Task Service (CRUD + BullMQ integration) | 2 hours |
| **Phase 5** | Notification Service (email + Nodemailer) | 1.5 hours |
| **Phase 6** | Queue Worker (BullMQ processors) | 1 hour |
| **Phase 7** | API Gateway (routing + rate limiting) | 2 hours |
| **Phase 8** | Frontend (Nuxt 4 + Shadcn-vue + auth flow) | 3 hours |
| **Phase 9** | Integration testing + documentation | 1.5 hours |
| **Phase 10** | GitHub Actions CI + README + deployment guide | 1 hour |
| **TOTAL** | | **16-17 hours** |

---

## Next Steps

1. Create GitHub repository: `faizkhairi/microservices-demo`
2. Initialize monorepo structure
3. Implement services in order: Auth → User → Task → Notification → Queue Worker → API Gateway → Frontend
4. Add Docker Compose for local development
5. Add GitHub Actions CI/CD
6. Write comprehensive README + deployment guide
7. Set as public repository with topics: `microservices`, `nestjs`, `nuxt`, `docker`, `postgresql`, `bullmq`

**End of Architecture Design**
