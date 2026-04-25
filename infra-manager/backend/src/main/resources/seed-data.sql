-- ============================================================
-- Infrastructure Manager — Sample Seed Data
-- Run after schema.sql
-- ============================================================

-- Default admin (password: admin123 — BCrypt hash)
INSERT INTO users (username, password_hash, email, full_name, role, active)
VALUES 
  ('admin', '$2a$10$u5IlQckc7R.lcZZ5rKRdKOcuDRET/D8kG9nrLxrP56fB.nYMVoqje', 'nagendranaidua@hotmail.com', 'Nagendra', 'ADMIN', true),
  ('operator1', '$2a$10$u5IlQckc7R.lcZZ5rKRdKOcuDRET/D8kG9nrLxrP56fB.nYMVoqje', 'operator@example.com', 'Ops User', 'OPERATOR', true),
  ('viewer1', '$2a$10$u5IlQckc7R.lcZZ5rKRdKOcuDRET/D8kG9nrLxrP56fB.nYMVoqje', 'viewer@example.com', 'View User', 'VIEWER', true)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  active = EXCLUDED.active;

-- Applications
INSERT INTO applications (id, name, description, eureka_url, eureka_enabled, active) VALUES
  (1, 'Application1', 'Core Trading Platform — handles order processing, risk management, and settlement', 'http://eureka-app1.internal:8761', true, true),
  (2, 'Application2', 'Risk Management System — real-time risk calculations and reporting', NULL, false, true),
  (3, 'Application3', 'Customer Portal — web frontend and API gateway for client-facing services', 'http://eureka-app3.internal:8761', true, true)
ON CONFLICT DO NOTHING;
SELECT setval('applications_id_seq', 3);

-- Servers for Application1
INSERT INTO servers (id, application_id, machine_name, alias, ip_address, environment, availability_zone, datacenter, os, vm_server, vm_type, os_version, cpu, ram, disk, usage_role, is_app_server, ssh_username, ssh_port, remark, tadp_ref, status) VALUES
  (1,  1, 'machine1',  'NOSAPACHEA01', '10.1.1.10', 'PRODUCTION',  'A', 'DC1', 'Linux', true, 'VMWare', 'RHEL 7.6', 4,  '4 GB',   '100 GB', 'Apache',    true,  'svc_infra', 22, 'Apache 2.4.62', 'TADP-001', 'ACTIVE'),
  (2,  1, 'machine2',  'NOSAPACHEB01', '10.1.1.11', 'PRODUCTION',  'B', 'DC1', 'Linux', true, 'VMWare', 'RHEL 7.6', 4,  '4 GB',   '100 GB', 'Apache',    true,  'svc_infra', 22, 'Apache 2.4.62', 'TADP-002', 'ACTIVE'),
  (3,  1, 'machine3',  'NOSWLSA01',    '10.1.2.10', 'PRODUCTION',  'A', 'DC1', 'Linux', true, 'VMWare', 'RHEL 8.4', 8,  '16 GB',  '200 GB', 'WebLogic',  true,  'svc_infra', 22, 'WebLogic 14c',  'TADP-003', 'ACTIVE'),
  (4,  1, 'machine4',  'NOSWLSB01',    '10.1.2.11', 'PRODUCTION',  'B', 'DC1', 'Linux', true, 'VMWare', 'RHEL 8.4', 8,  '16 GB',  '200 GB', 'WebLogic',  true,  'svc_infra', 22, 'WebLogic 14c',  'TADP-004', 'ACTIVE'),
  (5,  1, 'machine5',  'NOSTIBCOA01',  '10.1.3.10', 'PRODUCTION',  'A', 'DC2', 'Linux', true, 'VMWare', 'RHEL 7.9', 16, '32 GB',  '500 GB', 'TIBCO',     true,  'svc_infra', 22, 'TIBCO EMS 8.6', 'TADP-005', 'ACTIVE'),
  (6,  1, 'machine6',  'NOSTIBCOB01',  '10.1.3.11', 'PRODUCTION',  'B', 'DC2', 'Linux', true, 'VMWare', 'RHEL 7.9', 16, '32 GB',  '500 GB', 'TIBCO',     true,  'svc_infra', 22, 'TIBCO EMS 8.6', 'TADP-006', 'ACTIVE'),
  (7,  1, 'machine7',  'NOSAPPA01',    '10.1.4.10', 'PRODUCTION',  'A', 'DC1', 'Linux', true, 'VMWare', 'RHEL 8.4', 8,  '16 GB',  '200 GB', 'AppServer', true,  'svc_infra', 22, 'Spring Boot',   'TADP-007', 'ACTIVE'),
  (8,  1, 'machine8',  'NOSAPPA02',    '10.1.4.11', 'PRODUCTION',  'A', 'DC1', 'Linux', true, 'VMWare', 'RHEL 8.4', 8,  '16 GB',  '200 GB', 'AppServer', true,  'svc_infra', 22, 'Spring Boot',   'TADP-008', 'ACTIVE'),
  (9,  1, 'machine9',  'NOSAPPB01',    '10.1.4.20', 'PRODUCTION',  'B', 'DC2', 'Linux', true, 'VMWare', 'RHEL 8.4', 8,  '16 GB',  '200 GB', 'AppServer', true,  'svc_infra', 22, 'Spring Boot',   'TADP-009', 'ACTIVE'),
  (10, 1, 'machine10', 'NOSAPPB02',    '10.1.4.21', 'PRODUCTION',  'B', 'DC2', 'Linux', true, 'VMWare', 'RHEL 8.4', 8,  '16 GB',  '200 GB', 'AppServer', true,  'svc_infra', 22, 'Spring Boot',   'TADP-010', 'ACTIVE'),
  (11, 1, 'machine11', 'NOSUATA01',    '10.1.5.10', 'UAT',         'A', 'DC1', 'Linux', true, 'VMWare', 'RHEL 8.4', 4,  '8 GB',   '100 GB', 'AppServer', true,  'svc_infra', 22, 'UAT Environment','TADP-011', 'ACTIVE'),
  (12, 1, 'machine12', 'NOSDEVA01',    '10.1.6.10', 'DEVELOPMENT', 'A', 'DC1', 'Linux', true, 'VMWare', 'RHEL 8.4', 4,  '8 GB',   '100 GB', 'AppServer', true,  'svc_infra', 22, 'Dev Environment','TADP-012', 'ACTIVE')
ON CONFLICT DO NOTHING;

-- Servers for Application2
INSERT INTO servers (id, application_id, machine_name, alias, ip_address, environment, availability_zone, datacenter, os, vm_server, vm_type, os_version, cpu, ram, disk, usage_role, is_app_server, ssh_username, ssh_port, status) VALUES
  (13, 2, 'risk-srv1', 'RISKA01',  '10.2.1.10', 'PRODUCTION', 'A', 'DC1', 'Linux', true, 'VMWare', 'RHEL 8.4', 16, '64 GB', '1 TB',  'AppServer', true, 'svc_risk', 22, 'ACTIVE'),
  (14, 2, 'risk-srv2', 'RISKA02',  '10.2.1.11', 'PRODUCTION', 'A', 'DC1', 'Linux', true, 'VMWare', 'RHEL 8.4', 16, '64 GB', '1 TB',  'AppServer', true, 'svc_risk', 22, 'ACTIVE'),
  (15, 2, 'risk-srv3', 'RISKB01',  '10.2.1.20', 'PRODUCTION', 'B', 'DC2', 'Linux', true, 'VMWare', 'RHEL 8.4', 16, '64 GB', '1 TB',  'AppServer', true, 'svc_risk', 22, 'ACTIVE'),
  (16, 2, 'risk-db1',  'RISKDB01', '10.2.2.10', 'PRODUCTION', 'A', 'DC1', 'Linux', true, 'VMWare', 'RHEL 8.4', 8,  '32 GB', '2 TB',  'Database',  false,'svc_risk', 22, 'ACTIVE')
ON CONFLICT DO NOTHING;

-- Servers for Application3
INSERT INTO servers (id, application_id, machine_name, alias, ip_address, environment, availability_zone, datacenter, os, vm_server, vm_type, os_version, cpu, ram, disk, usage_role, is_app_server, ssh_username, ssh_port, status) VALUES
  (17, 3, 'portal-web1', 'PORTALWEB01', '10.3.1.10', 'PRODUCTION', 'A', 'DC1', 'Linux', true, 'VMWare', 'RHEL 8.4', 4, '8 GB',  '100 GB', 'WebServer',  true,  'svc_portal', 22, 'ACTIVE'),
  (18, 3, 'portal-web2', 'PORTALWEB02', '10.3.1.11', 'PRODUCTION', 'B', 'DC2', 'Linux', true, 'VMWare', 'RHEL 8.4', 4, '8 GB',  '100 GB', 'WebServer',  true,  'svc_portal', 22, 'ACTIVE'),
  (19, 3, 'portal-app1', 'PORTALAPP01', '10.3.2.10', 'PRODUCTION', 'A', 'DC1', 'Linux', true, 'VMWare', 'RHEL 8.4', 8, '16 GB', '200 GB', 'AppServer',  true,  'svc_portal', 22, 'ACTIVE'),
  (20, 3, 'portal-app2', 'PORTALAPP02', '10.3.2.11', 'PRODUCTION', 'B', 'DC2', 'Linux', true, 'VMWare', 'RHEL 8.4', 8, '16 GB', '200 GB', 'AppServer',  true,  'svc_portal', 22, 'ACTIVE')
ON CONFLICT DO NOTHING;
SELECT setval('servers_id_seq', 20);

-- Microservices for Application1
INSERT INTO services (id, application_id, name, description, jar_name, version, start_script, stop_script, health_check_script, eureka_service_name, base_port, active) VALUES
  (1, 1, 'order-service',     'Order processing and fulfillment',       'order-service-2.1.0.jar',     '2.1.0', '/opt/apps/order-service/start.sh',     '/opt/apps/order-service/stop.sh',     '/opt/apps/order-service/status.sh',     'ORDER-SERVICE',     8081, true),
  (2, 1, 'payment-service',   'Payment gateway integration',            'payment-service-1.5.2.jar',   '1.5.2', '/opt/apps/payment-service/start.sh',   '/opt/apps/payment-service/stop.sh',   '/opt/apps/payment-service/status.sh',   'PAYMENT-SERVICE',   8082, true),
  (3, 1, 'settlement-service','Trade settlement and reconciliation',    'settlement-service-3.0.1.jar','3.0.1', '/opt/apps/settlement-service/start.sh', '/opt/apps/settlement-service/stop.sh', '/opt/apps/settlement-service/status.sh','SETTLEMENT-SERVICE', 8083, true),
  (4, 1, 'notification-service','Email and SMS notifications',          'notification-service-1.2.0.jar','1.2.0','/opt/apps/notification-service/start.sh','/opt/apps/notification-service/stop.sh','/opt/apps/notification-service/status.sh','NOTIFICATION-SERVICE',8084, true),
  (5, 1, 'audit-trail-service','Trade audit logging',                   'audit-trail-service-1.0.0.jar','1.0.0','/opt/apps/audit-trail/start.sh',       '/opt/apps/audit-trail/stop.sh',       '/opt/apps/audit-trail/status.sh',       'AUDIT-TRAIL',       8085, true)
ON CONFLICT DO NOTHING;

-- Microservices for Application2
INSERT INTO services (id, application_id, name, description, jar_name, version, start_script, stop_script, health_check_script, eureka_service_name, base_port, active) VALUES
  (6, 2, 'risk-calculator',   'Real-time risk calculation engine',     'risk-calculator-4.0.0.jar',   '4.0.0', '/opt/apps/risk-calc/start.sh',     '/opt/apps/risk-calc/stop.sh',     '/opt/apps/risk-calc/status.sh',     NULL, 9001, true),
  (7, 2, 'market-data-feed',  'Market data ingestion and distribution','market-data-feed-2.3.1.jar',  '2.3.1', '/opt/apps/market-feed/start.sh',   '/opt/apps/market-feed/stop.sh',   '/opt/apps/market-feed/status.sh',   NULL, 9002, true),
  (8, 2, 'risk-aggregator',   'Position and exposure aggregation',     'risk-aggregator-1.1.0.jar',   '1.1.0', '/opt/apps/risk-agg/start.sh',      '/opt/apps/risk-agg/stop.sh',      '/opt/apps/risk-agg/status.sh',      NULL, 9003, true)
ON CONFLICT DO NOTHING;

-- Microservices for Application3
INSERT INTO services (id, application_id, name, description, jar_name, version, start_script, stop_script, health_check_script, eureka_service_name, base_port, active) VALUES
  (9,  3, 'api-gateway',       'API Gateway and routing',              'api-gateway-2.0.0.jar',       '2.0.0', '/opt/apps/api-gw/start.sh',        '/opt/apps/api-gw/stop.sh',        '/opt/apps/api-gw/status.sh',        'API-GATEWAY',       8080, true),
  (10, 3, 'user-service',      'User authentication and profiles',     'user-service-1.4.0.jar',      '1.4.0', '/opt/apps/user-service/start.sh',  '/opt/apps/user-service/stop.sh',  '/opt/apps/user-service/status.sh',  'USER-SERVICE',      8086, true),
  (11, 3, 'document-service',  'Document upload and management',       'document-service-1.1.0.jar',  '1.1.0', '/opt/apps/doc-service/start.sh',   '/opt/apps/doc-service/stop.sh',   '/opt/apps/doc-service/status.sh',   'DOCUMENT-SERVICE',  8087, true)
ON CONFLICT DO NOTHING;
SELECT setval('services_id_seq', 11);

-- Service Allocations for Application1
INSERT INTO service_allocations (id, server_id, service_id, planned_instance_count, deploy_path, config_overrides, status) VALUES
  (1,  7,  1, 2, '/opt/apps/order-service/',      '{"JAVA_OPTS":"-Xmx1g -Xms512m","SPRING_PROFILES_ACTIVE":"production"}',  'ACTIVE'),
  (2,  8,  1, 2, '/opt/apps/order-service/',      '{"JAVA_OPTS":"-Xmx1g -Xms512m","SPRING_PROFILES_ACTIVE":"production"}',  'ACTIVE'),
  (3,  9,  1, 1, '/opt/apps/order-service/',      '{"JAVA_OPTS":"-Xmx1g -Xms512m","SPRING_PROFILES_ACTIVE":"production"}',  'ACTIVE'),
  (4,  7,  2, 1, '/opt/apps/payment-service/',    '{"JAVA_OPTS":"-Xmx512m","SPRING_PROFILES_ACTIVE":"production"}',          'ACTIVE'),
  (5,  9,  2, 1, '/opt/apps/payment-service/',    '{"JAVA_OPTS":"-Xmx512m","SPRING_PROFILES_ACTIVE":"production"}',          'ACTIVE'),
  (6,  8,  3, 1, '/opt/apps/settlement-service/', '{"JAVA_OPTS":"-Xmx2g","SPRING_PROFILES_ACTIVE":"production"}',            'ACTIVE'),
  (7,  10, 3, 1, '/opt/apps/settlement-service/', '{"JAVA_OPTS":"-Xmx2g","SPRING_PROFILES_ACTIVE":"production"}',            'ACTIVE'),
  (8,  7,  4, 1, '/opt/apps/notification-service/','{"JAVA_OPTS":"-Xmx256m"}',                                               'ACTIVE'),
  (9,  10, 5, 1, '/opt/apps/audit-trail/',        '{"JAVA_OPTS":"-Xmx512m"}',                                               'ACTIVE'),
  (10, 11, 1, 1, '/opt/apps/order-service/',      '{"SPRING_PROFILES_ACTIVE":"uat"}',                                        'ACTIVE'),
  (11, 12, 1, 1, '/opt/apps/order-service/',      '{"SPRING_PROFILES_ACTIVE":"dev"}',                                        'ACTIVE')
ON CONFLICT DO NOTHING;

-- Allocations for Application2
INSERT INTO service_allocations (id, server_id, service_id, planned_instance_count, deploy_path, config_overrides, status) VALUES
  (12, 13, 6, 2, '/opt/apps/risk-calc/',    '{"JAVA_OPTS":"-Xmx8g -XX:+UseG1GC"}', 'ACTIVE'),
  (13, 14, 6, 2, '/opt/apps/risk-calc/',    '{"JAVA_OPTS":"-Xmx8g -XX:+UseG1GC"}', 'ACTIVE'),
  (14, 15, 6, 1, '/opt/apps/risk-calc/',    '{"JAVA_OPTS":"-Xmx8g -XX:+UseG1GC"}', 'ACTIVE'),
  (15, 13, 7, 1, '/opt/apps/market-feed/',  '{"JAVA_OPTS":"-Xmx4g"}',              'ACTIVE'),
  (16, 14, 8, 1, '/opt/apps/risk-agg/',     '{"JAVA_OPTS":"-Xmx4g"}',              'ACTIVE')
ON CONFLICT DO NOTHING;

-- Allocations for Application3
INSERT INTO service_allocations (id, server_id, service_id, planned_instance_count, deploy_path, config_overrides, status) VALUES
  (17, 17, 9,  1, '/opt/apps/api-gw/',        '{"JAVA_OPTS":"-Xmx512m"}', 'ACTIVE'),
  (18, 18, 9,  1, '/opt/apps/api-gw/',        '{"JAVA_OPTS":"-Xmx512m"}', 'ACTIVE'),
  (19, 19, 10, 2, '/opt/apps/user-service/',   '{"JAVA_OPTS":"-Xmx1g"}',  'ACTIVE'),
  (20, 20, 10, 2, '/opt/apps/user-service/',   '{"JAVA_OPTS":"-Xmx1g"}',  'ACTIVE'),
  (21, 19, 11, 1, '/opt/apps/doc-service/',    '{"JAVA_OPTS":"-Xmx512m"}','ACTIVE'),
  (22, 20, 11, 1, '/opt/apps/doc-service/',    '{"JAVA_OPTS":"-Xmx512m"}','ACTIVE')
ON CONFLICT DO NOTHING;
SELECT setval('service_allocations_id_seq', 22);

-- Service Instances for key allocations
-- order-service on server 7 (2 instances)
INSERT INTO service_instances (id, allocation_id, instance_index, port, pid, status, eureka_registered, health_status) VALUES
  (1,  1, 0, 8081, 12345, 'RUNNING', true,  'UP'),
  (2,  1, 1, 8082, 12346, 'RUNNING', true,  'UP'),
  (3,  2, 0, 8081, 22345, 'RUNNING', true,  'UP'),
  (4,  2, 1, 8082, 22346, 'RUNNING', true,  'UP'),
  (5,  3, 0, 8081, 32345, 'RUNNING', true,  'UP'),
  (6,  4, 0, 8082, 12400, 'RUNNING', true,  'UP'),
  (7,  5, 0, 8082, 32400, 'RUNNING', true,  'UP'),
  (8,  6, 0, 8083, 22500, 'RUNNING', true,  'UP'),
  (9,  7, 0, 8083, 42500, 'STOPPED', false, 'DOWN'),
  (10, 8, 0, 8084, 12600, 'RUNNING', true,  'UP'),
  (11, 9, 0, 8085, 42600, 'RUNNING', true,  'UP'),
  (12, 10,0, 8081, 52345, 'RUNNING', false, 'UP'),
  (13, 11,0, 8081, NULL,  'STOPPED', false, 'DOWN'),
  -- App2 instances
  (14, 12,0, 9001, 61001, 'RUNNING', false, 'UP'),
  (15, 12,1, 9002, 61002, 'RUNNING', false, 'UP'),
  (16, 13,0, 9001, 62001, 'RUNNING', false, 'UP'),
  (17, 13,1, 9002, 62002, 'RUNNING', false, 'UP'),
  (18, 14,0, 9001, 63001, 'RUNNING', false, 'UP'),
  (19, 15,0, 9002, 64001, 'RUNNING', false, 'UP'),
  (20, 16,0, 9003, 65001, 'RUNNING', false, 'UP'),
  -- App3 instances
  (21, 17,0, 8080, 71001, 'RUNNING', true,  'UP'),
  (22, 18,0, 8080, 72001, 'RUNNING', true,  'UP'),
  (23, 19,0, 8086, 73001, 'RUNNING', true,  'UP'),
  (24, 19,1, 8088, 73002, 'RUNNING', true,  'UP'),
  (25, 20,0, 8086, 74001, 'RUNNING', true,  'UP'),
  (26, 20,1, 8088, 74002, 'STOPPED', false, 'DOWN'),
  (27, 21,0, 8087, 73101, 'RUNNING', true,  'UP'),
  (28, 22,0, 8087, 74101, 'RUNNING', true,  'UP')
ON CONFLICT DO NOTHING;
SELECT setval('service_instances_id_seq', 28);
