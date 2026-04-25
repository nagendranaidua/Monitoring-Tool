# Infrastructure Manager — System Design Document

## 1. Overview

A React-based infrastructure management tool for configuring application servers, managing Spring Boot microservice allocations, and performing SSH-based operations (start/stop/health check).

**Tech Stack:**
- **Frontend:** React 18 + Material UI (MUI v5) + React Router
- **Backend:** Java 17 + Spring Boot 3.x + Spring Security (JWT)
- **Database:** PostgreSQL 15+
- **SSH:** JSch library for remote server operations
- **Build:** Maven (backend), Vite (frontend)

---

## 2. RBAC Roles

| Role     | View Servers | Edit Servers | Manage Services | Start/Stop | Health Check | Manage Users |
|----------|-------------|-------------|-----------------|-----------|-------------|-------------|
| VIEWER   | ✅          | ❌          | ❌              | ❌        | ✅          | ❌          |
| OPERATOR | ✅          | ❌          | ✅              | ✅        | ✅          | ❌          |
| ADMIN    | ✅          | ✅          | ✅              | ✅        | ✅          | ✅          |

---

## 3. API Endpoints

### Authentication
```
POST   /api/auth/login          → { token, role, username }
POST   /api/auth/logout         → 200 OK
GET    /api/auth/me             → current user profile
```

### Applications
```
GET    /api/applications                    → list all apps
GET    /api/applications/{id}               → app detail + server count
POST   /api/applications                    → create app (ADMIN)
PUT    /api/applications/{id}               → update app (ADMIN)
DELETE /api/applications/{id}               → soft-delete (ADMIN)
```

### Servers
```
GET    /api/applications/{appId}/servers           → list servers for an app
GET    /api/servers/{id}                            → server detail
POST   /api/applications/{appId}/servers            → add server (ADMIN)
PUT    /api/servers/{id}                            → update server (ADMIN)
DELETE /api/servers/{id}                            → soft-delete (ADMIN)
POST   /api/servers/{id}/health-check               → on-demand health check via SSH
```

### Services (Microservices)
```
GET    /api/services                                → list all microservices
GET    /api/services/{id}                           → service detail + allocations
POST   /api/services                                → create service (ADMIN/OPERATOR)
PUT    /api/services/{id}                           → update service config
DELETE /api/services/{id}                           → soft-delete
```

### Service Allocations (many-to-many: service ↔ server)
```
GET    /api/allocations?serverId=X                  → allocations for a server
GET    /api/allocations?serviceId=X                 → allocations for a service
POST   /api/allocations                             → allocate service to server
DELETE /api/allocations/{id}                        → remove allocation
PUT    /api/allocations/{id}/move                   → move allocation to another server
POST   /api/allocations/{id}/start                  → SSH start (runs start.sh)
POST   /api/allocations/{id}/stop                   → SSH stop (runs stop.sh)
GET    /api/allocations/{id}/status                 → SSH health check (runs health_check.sh)
```

### Excel Import (one-time)
```
POST   /api/import/excel                            → upload Excel, seed DB (ADMIN)
```

### Users (ADMIN only)
```
GET    /api/users
POST   /api/users
PUT    /api/users/{id}
DELETE /api/users/{id}
```

### Audit Log
```
GET    /api/audit-log?page=0&size=20&entity=SERVER  → paginated audit trail
```

---

## 4. Sample JSON Payloads

### 4.1 Application List Response
```json
{
  "data": [
    {
      "id": 1,
      "name": "Application1",
      "description": "Core trading platform",
      "serverCount": 12,
      "activeServices": 8,
      "active": true,
      "createdAt": "2026-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "name": "Application2",
      "description": "Risk management system",
      "serverCount": 6,
      "activeServices": 4,
      "active": true,
      "createdAt": "2026-02-20T14:00:00Z"
    }
  ],
  "totalCount": 2
}
```

### 4.2 Server Detail Response
```json
{
  "id": 1,
  "applicationId": 1,
  "applicationName": "Application1",
  "machineName": "machine1",
  "alias": "NOSAPACHEA01",
  "ipAddress": "1.2.3.4",
  "environment": "PRODUCTION",
  "availabilityZone": "A",
  "datacenter": "DC1",
  "os": "Linux",
  "vmServer": true,
  "vmType": "VMWare",
  "osVersion": "RHEL 7.6",
  "cpu": 4,
  "ram": "4 GB",
  "disk": "100 GB",
  "usageRole": "Apache",
  "isApplicationServer": true,
  "remark": "2.4.62",
  "sshPort": 22,
  "sshUsername": "svc_infra",
  "status": "ACTIVE",
  "allocatedServices": [
    {
      "allocationId": 10,
      "serviceId": 3,
      "serviceName": "order-service",
      "status": "RUNNING",
      "deployPath": "/opt/apps/order-service/",
      "healthStatus": "UP",
      "lastHealthCheck": "2026-04-23T08:00:00Z"
    }
  ]
}
```

### 4.3 Service Definition
```json
{
  "id": 3,
  "name": "order-service",
  "description": "Handles order processing and fulfillment",
  "jarName": "order-service-2.1.0.jar",
  "version": "2.1.0",
  "startScript": "/opt/apps/order-service/start.sh",
  "stopScript": "/opt/apps/order-service/stop.sh",
  "healthCheckScript": "/opt/apps/order-service/status.sh",
  "port": 8081,
  "active": true,
  "allocations": [
    { "serverId": 1, "serverAlias": "NOSAPACHEA01", "status": "RUNNING" },
    { "serverId": 5, "serverAlias": "NOSAPACHEB01", "status": "STOPPED" }
  ]
}
```

### 4.4 Create Allocation Request
```json
{
  "serviceId": 3,
  "serverId": 5,
  "deployPath": "/opt/apps/order-service/",
  "configOverrides": {
    "JAVA_OPTS": "-Xmx512m -Xms256m",
    "SPRING_PROFILES_ACTIVE": "production"
  }
}
```

### 4.5 Move Allocation Request
```json
{
  "targetServerId": 8,
  "stopOnSource": true,
  "startOnTarget": true
}
```

### 4.6 Health Check Response
```json
{
  "serverId": 1,
  "serverAlias": "NOSAPACHEA01",
  "checkedAt": "2026-04-23T16:45:00Z",
  "reachable": true,
  "system": {
    "cpuUsagePercent": 42.5,
    "memoryUsedMB": 2800,
    "memoryTotalMB": 4096,
    "diskUsedPercent": 67.3,
    "uptime": "45 days, 3:12:07"
  },
  "services": [
    {
      "allocationId": 10,
      "serviceName": "order-service",
      "status": "RUNNING",
      "pid": 12345,
      "portListening": true,
      "uptimeSeconds": 3888000
    }
  ]
}
```

### 4.7 Login Response
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "nagendranaidua@hotmail.com",
    "role": "ADMIN"
  }
}
```

---

## 5. UI Pages / Routes

| Route                        | Page                | Description                                      |
|------------------------------|---------------------|--------------------------------------------------|
| `/login`                     | Login               | Username/password form                           |
| `/`                          | Dashboard           | App cards with server/service counts             |
| `/apps/:id`                  | Application Detail  | Server data grid + add/edit server dialogs       |
| `/apps/:id/servers/:sId`    | Server Detail       | Full config view + allocated services list       |
| `/services`                  | Service Registry    | All microservices, CRUD, filter by app           |
| `/allocations`               | Allocation Board    | Drag-and-drop or table view of service→server    |
| `/health`                    | Health Dashboard    | Run checks, view results per server              |
| `/users`                     | User Management     | ADMIN only — manage users and roles              |
| `/audit`                     | Audit Log           | Searchable/filterable action history             |
| `/import`                    | Excel Import        | One-time upload page (ADMIN)                     |

---

## 6. Key Design Decisions

1. **SSH passwords encrypted in DB** using AES-256 with a config-file master key (never committed to VCS).
2. **Audit logging** on every mutating action — who did what, when, from where.
3. **Soft deletes** everywhere — nothing is permanently removed; `active=false` flag used.
4. **JSONB `config_overrides`** on allocations allows per-deployment JVM args, Spring profiles, etc.
5. **Health check scripts** are fully customizable per service — the tool just executes them over SSH and parses stdout.
6. **Move allocation** = stop on source server → update DB → start on target server (atomic with rollback on failure).

