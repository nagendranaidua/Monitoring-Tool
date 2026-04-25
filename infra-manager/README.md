# Infrastructure Manager

A full-stack infrastructure management tool for configuring application servers, managing Spring Boot microservice allocations, performing SSH-based operations, and integrating with Eureka service discovery.

## Tech Stack

- **Frontend:** React 18 + Material UI 5 + Vite
- **Backend:** Java 17 + Spring Boot 3.2 + Spring Security (JWT)
- **Database:** PostgreSQL 15+
- **SSH:** JSch (remote server operations)
- **Service Discovery:** Spring Cloud Eureka (optional per app)

## Features

- **Multi-Application Support** — Manage multiple applications, each with its own set of servers and microservices
- **Server Configuration** — Full CRUD with Excel-style column filtering (environment, datacenter, AZ, usage role, OS, VM type, status)
- **Microservice Registry** — Register Spring Boot JARs with custom start/stop/health scripts per service
- **Service Allocations** — Many-to-many allocation of services to servers with instance-level control
- **Instance Management** — Start, stop, and move individual service instances across servers via SSH
- **Eureka Integration** — Live mismatch detection comparing configured allocations against Eureka service registry
- **Rollback System** — Individual undo (per audit log entry) + snapshot-based full restore with automatic SSH stop/start
- **RBAC** — Three roles: ADMIN (full), OPERATOR (services + start/stop), VIEWER (read-only + health checks)
- **Audit Log** — Every action logged with before/after state for full traceability
- **Excel Import** — One-time seed from .xlsx (each sheet = application, each row = server)
- **On-Demand Health Checks** — SSH into servers to report CPU, memory, disk, and per-service process status

## Prerequisites

- Java 17+
- Node.js 18+ & npm
- PostgreSQL 15+
- Maven 3.8+

## Setup

### 1. Database

```bash
# Create the database
createdb infra_manager

# The schema is auto-applied on first boot via Spring's sql.init
# Or apply manually:
psql -d infra_manager -f backend/src/main/resources/schema.sql

# (Optional) Load sample data:
psql -d infra_manager -f backend/src/main/resources/seed-data.sql
```

### 2. Backend

```bash
cd backend

# Configure environment variables (or edit application.yml)
export DB_PASSWORD=your_postgres_password
export JWT_SECRET=YourSuperSecretKeyMinimum256Bits
export ENCRYPTION_KEY=YourAES256MasterKey

# Build and run
mvn clean package -DskipTests
java -jar target/infra-manager-backend-1.0.0.jar
```

Backend runs on http://localhost:8080

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173 (proxies /api to backend)

### 4. First Login

Default admin account: `admin` / `admin123` (change on first login)

## Project Structure

```
infra-manager/
├── backend/
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/inframanager/
│       │   ├── InfraManagerApplication.java
│       │   ├── config/          # CORS config
│       │   ├── controller/      # REST controllers (10)
│       │   ├── dto/             # Request/Response DTOs (24)
│       │   ├── entity/          # JPA entities (8)
│       │   ├── repository/      # Spring Data repos (8)
│       │   ├── security/        # JWT + RBAC (5)
│       │   ├── service/         # Business logic (12)
│       │   └── util/            # Encryption utility
│       └── resources/
│           ├── application.yml
│           ├── schema.sql
│           └── seed-data.sql
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── api/                 # Axios client + endpoints
│       ├── components/common/   # Shared components
│       ├── context/             # Auth context
│       ├── pages/               # 11 page components
│       ├── theme.js
│       ├── App.jsx
│       └── main.jsx
└── README.md
```

## API Endpoints Summary

| Method | Path | Description | Role |
|--------|------|-------------|------|
| POST | /api/auth/login | Login | Public |
| GET | /api/applications | List applications | Any |
| POST | /api/applications | Create application | ADMIN |
| GET | /api/applications/{appId}/servers | List servers | Any |
| POST | /api/servers/filter | Filter servers | Any |
| POST | /api/servers/{id}/health-check | SSH health check | OPERATOR+ |
| GET | /api/services?applicationId= | List services | Any |
| POST | /api/allocations | Create allocation | OPERATOR+ |
| PUT | /api/allocations/{id}/move | Move allocation | OPERATOR+ |
| POST | /api/instances/{id}/start | Start instance (SSH) | OPERATOR+ |
| POST | /api/instances/{id}/stop | Stop instance (SSH) | OPERATOR+ |
| PUT | /api/instances/{id}/move | Move instance | OPERATOR+ |
| GET | /api/eureka/mismatches/{appId} | Eureka mismatches | Any |
| POST | /api/eureka/sync/{appId} | Sync Eureka status | OPERATOR+ |
| POST | /api/snapshots | Create snapshot | OPERATOR+ |
| POST | /api/snapshots/{id}/restore | Restore snapshot | ADMIN |
| GET | /api/audit | Audit log | Any |
| POST | /api/import/excel | Import Excel | ADMIN |
