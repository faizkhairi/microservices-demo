# Microservices Demo

**Production-grade microservices platform** demonstrating enterprise architecture patterns with **Nuxt 4 + NestJS**.

Built by [Faiz Khairi](https://github.com/faizkhairi) to showcase scalable system design, message-driven architecture, and modern DevOps practices.

---

## 🏗️ Architecture

**7-Service Microservices Platform:**

```
Frontend (Nuxt 4)
       ↓
API Gateway (NestJS) — Routing, Auth, Rate Limiting
       ↓
    ┌──┴──┬──────┬──────────┬──────────┐
    ↓     ↓      ↓          ↓          ↓
  Auth  User   Task   Notification  Queue Worker
  :4001 :4002  :4003     :4004      (Background)
    ↓     ↓      ↓          ↓
  Auth  User   Task   Notification
   DB    DB     DB         DB
```

### Services

| Service | Port | Responsibility |
|---------|------|----------------|
| **Frontend** | 3000 | Nuxt 4 web app with Shadcn-vue |
| **API Gateway** | 4000 | Single entry point, JWT validation, rate limiting |
| **Auth Service** | 4001 | JWT authentication, refresh tokens, bcrypt password hashing |
| **User Service** | 4002 | User profiles and account management |
| **Task Service** | 4003 | Task CRUD + BullMQ job publishing |
| **Notification Service** | 4004 | Email + in-app notifications |
| **Queue Worker** | — | Background job processing with BullMQ |

### Infrastructure

- **4 PostgreSQL databases** (one per service — microservices pattern)
- **Redis** for message queue (BullMQ)
- **Mailpit** for email testing (dev)
- **Docker Compose** orchestrating 12 containers

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+
- [Node.js](https://nodejs.org/) 20+ (for local development)
- [pnpm](https://pnpm.io/) 8+ (optional)

### Run the Full Stack

```bash
# Clone the repository
git clone https://github.com/faizkhairi/microservices-demo.git
cd microservices-demo

# Copy environment variables
cp .env.example .env

# Start all services with Docker Compose
docker compose up --build

# Services will be available at:
# - Frontend: http://localhost:3000
# - API Gateway: http://localhost:4000
# - Mailpit UI: http://localhost:8025 (email testing)
```

**First-time setup:** Docker will build all 7 services + databases. This takes ~5-10 minutes.

---

## 📦 Tech Stack

### Frontend
- **Nuxt 4** — Vue 3 SSR framework
- **Shadcn-vue** — Copy-paste UI components
- **Tailwind CSS** — Utility-first styling
- **Pinia** — State management
- **Axios** — HTTP client with JWT interceptor

### Backend
- **NestJS** — Enterprise Node.js framework
- **Prisma ORM** — Type-safe database client
- **PostgreSQL 16** — Production-grade relational DB
- **Passport + JWT** — Authentication strategy
- **BullMQ + Redis** — Job queue for async processing
- **Nodemailer** — SMTP email sending

### DevOps
- **Docker** — Containerization
- **Docker Compose** — Multi-container orchestration
- **GitHub Actions** — CI/CD pipeline
- **Mailpit** — Email testing (catches all emails in dev)

---

## 🛠️ Development

### Run Services Individually

Each service can be run independently for development:

```bash
# Auth Service
cd services/auth-service
npm install
npm run dev  # Runs on port 4001

# User Service
cd services/user-service
npm install
npm run dev  # Runs on port 4002

# Frontend
cd frontend
npm install
npm run dev  # Runs on port 3000
```

### Database Migrations

```bash
# Auth Service migrations
cd services/auth-service
npx prisma migrate dev --name init
npx prisma generate

# User Service migrations
cd services/user-service
npx prisma migrate dev --name init
npx prisma generate

# Task Service migrations
cd services/task-service
npx prisma migrate dev --name init
npx prisma generate

# Notification Service migrations
cd services/notification-service
npx prisma migrate dev --name init
npx prisma generate
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests for specific service
cd services/auth-service
npm test

# E2E tests (Playwright)
cd frontend
npm run test:e2e
```

---

## 📖 Documentation

- [Architecture Design](./ARCHITECTURE.md) — Detailed system design
- [API Gateway](./services/api-gateway/README.md) — Routing and authentication
- [Auth Service](./services/auth-service/README.md) — JWT authentication
- [User Service](./services/user-service/README.md) — Profile management
- [Task Service](./services/task-service/README.md) — Task CRUD + queue
- [Notification Service](./services/notification-service/README.md) — Email + in-app notifications
- [Queue Worker](./services/queue-worker/README.md) — Background jobs

---

## 🔑 Key Features

### Microservices Architecture
- ✅ **Database per service** — Each service owns its data (no shared DB)
- ✅ **API Gateway pattern** — Centralized routing, auth, rate limiting
- ✅ **Service decomposition** — Clear domain boundaries (auth, users, tasks, notifications)

### Message-Driven Architecture
- ✅ **BullMQ + Redis** — Async job processing
- ✅ **Event-driven** — Task creation triggers notification job
- ✅ **Decoupled services** — Task Service doesn't directly call Notification Service

### Security
- ✅ **JWT authentication** — Stateless auth with 15-minute access tokens
- ✅ **Refresh tokens** — 7-day expiration for secure re-authentication
- ✅ **Bcrypt password hashing** — Industry-standard (salt rounds: 10)
- ✅ **Rate limiting** — 100 req/min per IP at API Gateway
- ✅ **Owner-only access** — Users can only access their own data

### DevOps
- ✅ **Docker Compose** — One-command local environment
- ✅ **Health checks** — Every service has `/health` endpoint
- ✅ **Structured logging** — Winston/Pino with correlation IDs
- ✅ **CI/CD pipeline** — GitHub Actions builds all services

---

## 🌐 Deployment

### Local Development
```bash
docker compose up
```

### Staging/Production

**Option 1: Docker Compose on VPS**
```bash
# On server (Ubuntu/Debian)
docker compose -f docker-compose.prod.yml up -d

# Services use production environment variables
# PostgreSQL, Redis, and services run in containers
```

**Option 2: Kubernetes (EKS/GKE/AKS)**
```bash
# Deploy to Kubernetes
kubectl apply -f k8s/

# Each service runs as a separate deployment
# RDS for PostgreSQL, ElastiCache for Redis
```

**Frontend Deployment:**
- Netlify (recommended) — Nuxt SSR with Nitro
- Vercel — Alternative for Next.js-like SSR
- Self-hosted with Nginx

---

## 📊 Data Flow Examples

### User Registration
```
1. User submits form (frontend)
   ↓
2. POST /auth/register → API Gateway
   ↓
3. API Gateway → Auth Service
   ↓
4. Auth Service creates user in auth_db
   ↓
5. Returns success → frontend redirects to login
```

### Create Task (with async notification)
```
1. User creates task (frontend)
   ↓
2. POST /tasks → API Gateway (validates JWT)
   ↓
3. API Gateway → Task Service
   ↓
4. Task Service:
   - Saves task to task_db
   - Publishes "task.created" job to BullMQ
   ↓
5. Queue Worker (background):
   - Picks up job from Redis
   - Calls Notification Service
   ↓
6. Notification Service:
   - Saves notification to notification_db
   - Sends email via Mailpit
```

---

## 🧰 Why This Stack?

| Technology | Reason |
|-----------|--------|
| **Nuxt 4** | SSR + Vue 3, production-ready, matches boilerplate |
| **NestJS** | Enterprise-grade, TypeScript-first, modular architecture |
| **PostgreSQL** | ACID compliance, production-grade, one DB per service |
| **Prisma** | Type-safe ORM, auto-migrations, excellent DX |
| **BullMQ** | Industry-standard Node.js job queue, Redis-backed |
| **Docker** | Consistent environments, easy orchestration |

---

## 🎯 What This Demonstrates

✅ **Microservices expertise** — Service decomposition, API Gateway, database per service
✅ **Message-driven architecture** — BullMQ job queues for async processing
✅ **Modern stack mastery** — Nuxt 4, NestJS, Prisma, PostgreSQL, Redis
✅ **DevOps capabilities** — Docker multi-container orchestration
✅ **Enterprise patterns** — JWT auth, rate limiting, structured logging
✅ **Scalability** — Each service can scale independently

---

## 📝 License

MIT License — See [LICENSE](./LICENSE) for details.

---

## 👤 Author

**Faiz Khairi**
- GitHub: [@faizkhairi](https://github.com/faizkhairi)
- LinkedIn: [linkedin.com/in/faizkhairi](https://www.linkedin.com/in/faizkhairi/)
- Website: [faizkhairi.my](https://faizkhairi.my)

---

## ⭐ Support

If you find this project helpful, please give it a star! ⭐

Built with ❤️ to showcase production-grade microservices architecture.
