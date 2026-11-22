# FreelanceHub API

A structured backend for a freelance marketplace connecting **clients** with **freelancers**. Built with NestJS, TypeScript, Prisma ORM and PostgreSQL.

> This repository contains the backend only. It does not include a frontend or a real payment gateway. Wallet top-ups are simulated for development, as specified in the project brief.

## Contents

- JWT authentication with short-lived access tokens, refresh-token rotation and per-device sessions.
- Role-based authorization (`CLIENT`, `FREELANCER`, `ADMIN`).
- Freelancer public profiles and image upload.
- Admin-managed categories with short-lived in-process cache invalidated on writes.
- Projects with ownership checks, file attachments, filtering, search, sorting and pagination.
- One offer per freelancer per project.
- Wallets, transaction ledger and escrow.
- Serializable database transactions for offer acceptance and delivery approval.
- 90% freelancer payout / 10% platform commission.
- Notifications REST endpoints and a Socket.IO gateway scaffold.
- Swagger documentation, validation, centralized exception formatting, Helmet and rate limiting.
- PostgreSQL schema, seed script, Docker Compose, Postman collection and ERD.

## Technology

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript |
| Framework | NestJS 10 |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Authentication | JWT + bcrypt |
| Validation | class-validator + class-transformer |
| API docs | Swagger |
| Real-time | Socket.IO |
| Scheduling / email | Nest Schedule + Nodemailer service |
| Containers | Docker + Docker Compose |

## Requirements

Install Node.js 20 or newer, npm, PostgreSQL 16 (or Docker Desktop), and Visual Studio Code. Postman is used to import and test the API collection.

## Quick start (local PostgreSQL)

1. Clone the repository and open its folder in VS Code.
2. Install dependencies:

   ```bash
   npm install
   ```
3. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell use `Copy-Item .env.example .env`. Set `DATABASE_URL` to your PostgreSQL database and replace both JWT secrets with long random values.
4. Create an empty PostgreSQL database named `freelancehub`.
5. Generate Prisma Client and apply the schema:

   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
6. Start the API:

   ```bash
   npm run start:dev
   ```

API base URL: `http://localhost:3000/api/v1`  
Swagger UI: `http://localhost:3000/api/v1/docs`  
Health check: `http://localhost:3000/api/v1/health`

## Quick start (Docker)

1. Copy `.env.example` to `.env`.
2. Make sure `DATABASE_URL` points to the compose database, for example:

   ```env
   DATABASE_URL=postgresql://postgres:postgres@db:5432/freelancehub?schema=public
   ```
3. Run:

   ```bash
   docker compose up --build
   ```

The API container applies existing Prisma migrations before starting. For a first-time deployment, create and commit a migration locally first with `npx prisma migrate dev --name init`.

## Seed data and administrator account

Create an admin only through the seed script; public registration deliberately accepts only `CLIENT` and `FREELANCER`.

Set these optional variables in `.env` before running the seed:

```env
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=ChangeThisAdminPassword123!
```

Then run:

```bash
npm run seed
```

The seed script inserts common categories and creates the admin account if the variables are provided. Do not commit real admin credentials.

## Postman

Import `postman/FreelanceHub.postman_collection.json` and `postman/FreelanceHub.local.postman_environment.json`.

1. Select the `FreelanceHub Local` environment.
2. Run Register Client and Register Freelancer.
3. Login with each account. The collection automatically stores `accessToken` and `refreshToken`.
4. Create a category as an admin (after setting an admin token).
5. Create a project as the client, submit an offer as the freelancer, and accept it as the client.
6. Submit a delivery as the freelancer and approve it as the client.

The collection is grouped by workflow and includes bearer-token variables. For multipart endpoints, select a local file in Postman.

## Core business rules

1. A user registers as a client or freelancer. Admin creation is restricted to the seed/bootstrap process.
2. A client can edit or delete only their own project, and only while it is `OPEN`.
3. Only freelancers can submit offers; the project must be open; the owner cannot bid on their own project.
4. A freelancer may submit one offer per project (database unique constraint).
5. Only the project owner may view offers for that project and accept/reject them.
6. Accepting an offer reserves the full price in escrow, marks the selected offer accepted, rejects other pending offers and moves the project to `IN_PROGRESS` atomically.
7. Only the selected freelancer may submit a delivery.
8. Only the project owner may approve a submitted delivery. Approval releases 90% to the freelancer, records the 10% platform fee and marks the project complete in one database transaction.
9. Wallet top-up is a simulated/manual operation, not a payment integration.
10. Suspended users cannot authenticate; their active sessions are revoked.

## Main API routes

All routes are prefixed with `/api/v1`.

| Method | Route | Access |
|---|---|---|
| GET | `/health` | Public |
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public, 5 attempts/minute |
| POST | `/auth/refresh` | Public |
| POST | `/auth/logout` | Authenticated |
| POST | `/auth/logout-others` | Authenticated |
| GET | `/categories` | Public |
| POST/PATCH/DELETE | `/categories` | Admin |
| GET | `/projects` | Public |
| GET | `/projects/:id` | Public |
| GET | `/projects/mine` | Authenticated |
| POST/PATCH/DELETE | `/projects` | Client (ownership enforced) |
| GET | `/users/freelancers/:id` | Public |
| PATCH | `/users/me/profile` | Authenticated |
| PATCH | `/users/me/avatar` | Authenticated |
| GET | `/users` | Admin |
| PATCH | `/users/:id/status` | Admin |
| POST | `/offers` | Freelancer |
| GET | `/offers/mine` | Freelancer |
| GET | `/offers/project/:projectId` | Project owner |
| POST | `/offers/:id/accept` | Project owner |
| POST | `/offers/:id/reject` | Project owner |
| GET | `/wallet` | Authenticated |
| POST | `/wallet/top-up` | Authenticated |
| GET | `/wallet/transactions` | Authenticated |
| POST | `/deliveries/projects/:projectId` | Selected freelancer |
| GET | `/deliveries/projects/:projectId` | Project owner / selected freelancer |
| POST | `/deliveries/:id/review` | Project owner |
| GET | `/notifications` | Authenticated |
| PATCH | `/notifications/:id/read` | Authenticated |

For request examples, fields and environment variables, use the included Postman collection and Swagger UI.

## Data model

The Prisma schema is the source of truth. The ERD is available in `docs/ERD.md` (Mermaid) and `docs/ERD.dbml` (DBML). Main entities: User, Session, Category, Project, Offer, Wallet, LedgerEntry, Delivery and Notification.

## Security notes and production checklist

- Passwords are hashed with bcrypt; refresh tokens are stored as SHA-256 hashes.
- Access tokens are short-lived. Refresh tokens rotate and a reused token revokes its session.
- DTO validation uses `whitelist`, `forbidNonWhitelisted` and transformation.
- Admin role cannot be submitted in public registration.
- Project, offer and delivery ownership is checked server-side.
- Login is rate-limited to five attempts per minute per IP by the throttler; the API also has a global request limit.
- Do not expose `.env`, secrets, uploaded files or database ports publicly.
- For production, configure Redis-backed shared rate limiting/cache/queues, SMTP, HTTPS, a reverse proxy, persistent private file storage and backups. Configure an antivirus/content-scanning pipeline before accepting user files.
- The current category cache is process-local. For multiple API replicas, replace it with shared Redis cache invalidation.
- The WebSocket gateway is scaffolded; authenticate sockets and join each connection to its own `user:{id}` room before using private real-time notifications.
- SMTP service is available but no email workflow/queue is enabled by default.
- Run automated tests and a manual end-to-end Postman workflow before deployment.

## Development commands

```bash
npm run start:dev
npm run build
npm test
npm run test:e2e
npx prisma studio
npx prisma migrate dev --name describe_change
npx prisma migrate deploy
```

## GitHub publishing

```bash
git init
git add .
git commit -m "feat: build FreelanceHub backend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/freelancehub-api.git
git push -u origin main
```

Before pushing, verify that `.env` is ignored and only `.env.example` is tracked.

## License

Educational project. Add a license if you intend to distribute or reuse it publicly.
#   F r e e l a n c e H u b  
 