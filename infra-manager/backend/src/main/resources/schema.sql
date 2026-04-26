-- ============================================================
-- Infrastructure Manager — PostgreSQL Schema
-- ============================================================

-- 1. Applications
CREATE TABLE IF NOT EXISTS applications (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    eureka_url      VARCHAR(500),
    eureka_enabled  BOOLEAN DEFAULT FALSE,
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Servers
CREATE TABLE IF NOT EXISTS servers (
    id                  BIGSERIAL PRIMARY KEY,
    application_id      BIGINT NOT NULL REFERENCES applications(id),
    server_name         VARCHAR(200) NOT NULL,
    alias               VARCHAR(100),
    ip_address          VARCHAR(45) NOT NULL,
    environment         VARCHAR(50) NOT NULL DEFAULT 'PRODUCTION',
    datacenter          VARCHAR(100),
    zone                VARCHAR(10),
    os_type             VARCHAR(30),
    os_version          VARCHAR(30),
    server_type         VARCHAR(100),
    cpu_count           INTEGER,
    cpu_cores           INTEGER,
    ram_gb              INTEGER,
    disk_size           VARCHAR(50),
    software            VARCHAR(100),
    ssh_username        VARCHAR(100),
    ssh_password_enc    VARCHAR(500),
    ssh_port            INTEGER DEFAULT 22,
    remarks             TEXT,
    tadp_hostname       VARCHAR(200),
    status              VARCHAR(20) DEFAULT 'ACTIVE',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_server_status CHECK (status IN ('ACTIVE','INACTIVE'))
);
CREATE INDEX idx_servers_app ON servers(application_id);
CREATE INDEX idx_servers_env ON servers(environment);
CREATE INDEX idx_servers_dc ON servers(datacenter);
CREATE INDEX idx_servers_software ON servers(software);

-- 3. Services (Microservices) — scoped per application
CREATE TABLE IF NOT EXISTS services (
    id                      BIGSERIAL PRIMARY KEY,
    application_id          BIGINT NOT NULL REFERENCES applications(id),
    name                    VARCHAR(100) NOT NULL,
    description             TEXT,
    jar_name                VARCHAR(200),
    version                 VARCHAR(30),
    start_script            VARCHAR(500),
    stop_script             VARCHAR(500),
    health_check_script     VARCHAR(500),
    eureka_service_name     VARCHAR(100),
    base_port               INTEGER,
    active                  BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(application_id, name)
);
CREATE INDEX idx_services_app ON services(application_id);

-- 4. Service Allocations (planned: which service runs on which server)
CREATE TABLE IF NOT EXISTS service_allocations (
    id                      BIGSERIAL PRIMARY KEY,
    server_id               BIGINT NOT NULL REFERENCES servers(id),
    service_id              BIGINT NOT NULL REFERENCES services(id),
    planned_instance_count  INTEGER DEFAULT 1,
    deploy_path             VARCHAR(500),
    config_overrides        JSONB DEFAULT '{}',
    status                  VARCHAR(20) DEFAULT 'ACTIVE',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(server_id, service_id),
    CONSTRAINT chk_alloc_status CHECK (status IN ('PLANNED','ACTIVE','INACTIVE'))
);
CREATE INDEX idx_alloc_server ON service_allocations(server_id);
CREATE INDEX idx_alloc_service ON service_allocations(service_id);

-- 5. Service Instances (actual running instances)
CREATE TABLE IF NOT EXISTS service_instances (
    id                  BIGSERIAL PRIMARY KEY,
    allocation_id       BIGINT NOT NULL REFERENCES service_allocations(id) ON DELETE CASCADE,
    instance_index      INTEGER NOT NULL DEFAULT 0,
    port                INTEGER NOT NULL,
    pid                 INTEGER,
    status              VARCHAR(20) DEFAULT 'STOPPED',
    eureka_registered   BOOLEAN DEFAULT FALSE,
    eureka_instance_id  VARCHAR(200),
    deploy_path         VARCHAR(500),
    jvm_args            TEXT,
    last_health_check   TIMESTAMP,
    health_status       VARCHAR(20) DEFAULT 'UNKNOWN',
    started_at          TIMESTAMP,
    stopped_at          TIMESTAMP,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(allocation_id, instance_index),
    CONSTRAINT chk_inst_status CHECK (status IN ('RUNNING','STOPPED','STARTING','STOPPING','ERROR')),
    CONSTRAINT chk_health_status CHECK (health_status IN ('UP','DOWN','UNKNOWN','OUT_OF_SERVICE'))
);
CREATE INDEX idx_inst_alloc ON service_instances(allocation_id);
CREATE INDEX idx_inst_status ON service_instances(status);

-- 6. Users (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(50) NOT NULL UNIQUE,
    password_hash   VARCHAR(200) NOT NULL,
    email           VARCHAR(100),
    full_name       VARCHAR(100),
    role            VARCHAR(20) NOT NULL DEFAULT 'VIEWER',
    active          BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_user_role CHECK (role IN ('ADMIN','OPERATOR','VIEWER'))
);

-- 7. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id),
    username        VARCHAR(50),
    action          VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       BIGINT,
    before_state    JSONB,
    after_state     JSONB,
    details         JSONB,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_time ON audit_log(created_at DESC);

-- 8. Allocation Snapshots
CREATE TABLE IF NOT EXISTS allocation_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    application_id  BIGINT REFERENCES applications(id),
    snapshot_data   JSONB NOT NULL,
    auto_trigger    VARCHAR(50),
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_snapshot_app ON allocation_snapshots(application_id);
CREATE INDEX idx_snapshot_time ON allocation_snapshots(created_at DESC);

-- ============================================================
-- Note: Seed data is populated via seed-data.sql
-- ============================================================
