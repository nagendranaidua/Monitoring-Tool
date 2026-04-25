package com.inframanager.service;

import com.inframanager.dto.HealthCheckResponse;
import com.inframanager.dto.ServiceHealthDto;
import com.inframanager.entity.Microservice;
import com.inframanager.entity.Server;
import com.inframanager.entity.ServiceAllocation;
import com.inframanager.entity.ServiceInstance;
import com.inframanager.repository.ServiceAllocationRepository;
import com.inframanager.util.EncryptionUtil;
import com.jcraft.jsch.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

@Slf4j
@Service
@RequiredArgsConstructor
public class SshService {

    private final ServiceAllocationRepository allocationRepository;

    @Value("${app.ssh.connection-timeout-ms:10000}")
    private int connectionTimeoutMs;

    @Value("${app.ssh.command-timeout-ms:30000}")
    private int commandTimeoutMs;

    @Value("${app.encryption.master-key}")
    private String masterKey;

    @Data
    @Builder
    @AllArgsConstructor
    public static class SshResult {
        private int exitCode;
        private String stdout;
        private String stderr;

        public boolean isSuccess() {
            return exitCode == 0;
        }
    }

    /**
     * Executes a command on the given server via SSH.
     */
    public SshResult executeCommand(Server server, String command) {
        Session session = null;
        ChannelExec channel = null;
        try {
            session = createSession(server);
            session.connect(connectionTimeoutMs);

            channel = (ChannelExec) session.openChannel("exec");
            channel.setCommand(command);

            ByteArrayOutputStream stdoutStream = new ByteArrayOutputStream();
            ByteArrayOutputStream stderrStream = new ByteArrayOutputStream();
            channel.setOutputStream(stdoutStream);
            channel.setErrStream(stderrStream);

            channel.connect(commandTimeoutMs);

            // Wait for the command to complete
            long startTime = System.currentTimeMillis();
            while (!channel.isClosed()) {
                if (System.currentTimeMillis() - startTime > commandTimeoutMs) {
                    log.warn("SSH command timed out on server {}: {}", server.getAlias(), command);
                    break;
                }
                Thread.sleep(100);
            }

            return SshResult.builder()
                    .exitCode(channel.getExitStatus())
                    .stdout(stdoutStream.toString().trim())
                    .stderr(stderrStream.toString().trim())
                    .build();

        } catch (JSchException e) {
            log.error("SSH connection failed for server {} ({}): {}", server.getAlias(), server.getIpAddress(), e.getMessage());
            return SshResult.builder()
                    .exitCode(-1)
                    .stdout("")
                    .stderr("SSH connection failed: " + e.getMessage())
                    .build();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return SshResult.builder()
                    .exitCode(-1)
                    .stdout("")
                    .stderr("Command interrupted: " + e.getMessage())
                    .build();
        } finally {
            if (channel != null && channel.isConnected()) {
                channel.disconnect();
            }
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    /**
     * Starts a service instance on the given server.
     */
    public SshResult startService(Server server, ServiceInstance instance, Microservice service) {
        String command = buildStartCommand(service, instance);
        log.info("Starting service {} instance {} on server {} (port {})",
                service.getName(), instance.getInstanceIndex(), server.getAlias(), instance.getPort());
        return executeCommand(server, command);
    }

    /**
     * Stops a service instance on the given server.
     */
    public SshResult stopService(Server server, ServiceInstance instance, Microservice service) {
        String command = buildStopCommand(service, instance);
        log.info("Stopping service {} instance {} on server {} (port {})",
                service.getName(), instance.getInstanceIndex(), server.getAlias(), instance.getPort());
        return executeCommand(server, command);
    }

    /**
     * Performs a health check on the server by gathering system info and checking allocated services.
     */
    public HealthCheckResponse healthCheck(Server server) {
        HealthCheckResponse.HealthCheckResponseBuilder response = HealthCheckResponse.builder()
                .serverId(server.getId())
                .serverAlias(server.getAlias())
                .checkedAt(LocalDateTime.now());

        // Test connectivity and gather system info
        SshResult uptimeResult = executeCommand(server, "uptime");
        if (uptimeResult.getExitCode() != 0) {
            return response.reachable(false).build();
        }

        response.reachable(true);

        // Gather system information
        HealthCheckResponse.SystemInfo systemInfo = gatherSystemInfo(server, uptimeResult.getStdout());
        response.system(systemInfo);

        // Check allocated service instances
        List<ServiceHealthDto> serviceHealthList = new ArrayList<>();
        List<ServiceAllocation> allocations = allocationRepository.findByServerId(server.getId());

        for (ServiceAllocation alloc : allocations) {
            for (ServiceInstance instance : alloc.getInstances()) {
                ServiceHealthDto health = checkInstanceHealth(server, alloc, instance);
                serviceHealthList.add(health);
            }
        }

        response.services(serviceHealthList);
        return response.build();
    }

    private Session createSession(Server server) throws JSchException {
        JSch jsch = new JSch();
        int port = server.getSshPort() != null ? server.getSshPort() : 22;
        Session session = jsch.getSession(server.getSshUsername(), server.getIpAddress(), port);

        if (server.getSshPasswordEnc() != null && !server.getSshPasswordEnc().isBlank()) {
            String password = EncryptionUtil.decrypt(server.getSshPasswordEnc(), masterKey);
            session.setPassword(password);
        }

        Properties config = new Properties();
        config.put("StrictHostKeyChecking", "no");
        config.put("PreferredAuthentications", "publickey,keyboard-interactive,password");
        session.setConfig(config);

        return session;
    }

    private String buildStartCommand(Microservice service, ServiceInstance instance) {
        if (service.getStartScript() != null && !service.getStartScript().isBlank()) {
            return service.getStartScript() + " " + instance.getPort();
        }
        // Default: run jar in background
        String deployPath = instance.getDeployPath() != null ? instance.getDeployPath() : "/opt/services/" + service.getName();
        String jvmArgs = instance.getJvmArgs() != null ? instance.getJvmArgs() : "";
        return String.format("cd %s && nohup java %s -jar %s --server.port=%d > /dev/null 2>&1 & echo $!",
                deployPath, jvmArgs, service.getJarName(), instance.getPort());
    }

    private String buildStopCommand(Microservice service, ServiceInstance instance) {
        if (service.getStopScript() != null && !service.getStopScript().isBlank()) {
            return service.getStopScript() + " " + instance.getPort();
        }
        // Default: kill by PID
        if (instance.getPid() != null && instance.getPid() > 0) {
            return "kill " + instance.getPid();
        }
        // Fallback: find and kill by port
        return String.format("kill $(lsof -t -i:%d) 2>/dev/null || true", instance.getPort());
    }

    private HealthCheckResponse.SystemInfo gatherSystemInfo(Server server, String uptimeOutput) {
        HealthCheckResponse.SystemInfo.SystemInfoBuilder info = HealthCheckResponse.SystemInfo.builder()
                .uptime(uptimeOutput);

        try {
            // CPU usage
            SshResult cpuResult = executeCommand(server, "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'");
            if (cpuResult.isSuccess() && !cpuResult.getStdout().isBlank()) {
                try {
                    info.cpuUsagePercent(Double.parseDouble(cpuResult.getStdout().replaceAll("[^0-9.]", "")));
                } catch (NumberFormatException ignored) {
                }
            }

            // Memory
            SshResult memResult = executeCommand(server, "free -m | awk '/^Mem:/ {print $2 \" \" $3}'");
            if (memResult.isSuccess() && !memResult.getStdout().isBlank()) {
                String[] parts = memResult.getStdout().split("\\s+");
                if (parts.length >= 2) {
                    try {
                        info.memoryTotalMB(Long.parseLong(parts[0]));
                        info.memoryUsedMB(Long.parseLong(parts[1]));
                    } catch (NumberFormatException ignored) {
                    }
                }
            }

            // Disk
            SshResult diskResult = executeCommand(server, "df -h / | awk 'NR==2 {print $5}'");
            if (diskResult.isSuccess() && !diskResult.getStdout().isBlank()) {
                try {
                    info.diskUsedPercent(Double.parseDouble(diskResult.getStdout().replace("%", "")));
                } catch (NumberFormatException ignored) {
                }
            }
        } catch (Exception e) {
            log.warn("Failed to gather system info for server {}: {}", server.getAlias(), e.getMessage());
        }

        return info.build();
    }

    private ServiceHealthDto checkInstanceHealth(Server server, ServiceAllocation alloc, ServiceInstance instance) {
        ServiceHealthDto.ServiceHealthDtoBuilder health = ServiceHealthDto.builder()
                .allocationId(alloc.getId())
                .serviceName(alloc.getService().getName())
                .instanceIndex(instance.getInstanceIndex())
                .port(instance.getPort())
                .status(instance.getStatus() != null ? instance.getStatus().name() : "UNKNOWN")
                .pid(instance.getPid());

        // Check if port is listening
        SshResult portCheck = executeCommand(server,
                String.format("ss -tlnp | grep ':%d ' | wc -l", instance.getPort()));
        boolean portListening = portCheck.isSuccess() && !portCheck.getStdout().isBlank()
                && Integer.parseInt(portCheck.getStdout().trim()) > 0;
        health.portListening(portListening);

        // Check process uptime if PID exists
        if (instance.getPid() != null && instance.getPid() > 0) {
            SshResult uptimeCheck = executeCommand(server,
                    String.format("ps -o etimes= -p %d 2>/dev/null", instance.getPid()));
            if (uptimeCheck.isSuccess() && !uptimeCheck.getStdout().isBlank()) {
                try {
                    health.uptimeSeconds(Long.parseLong(uptimeCheck.getStdout().trim()));
                } catch (NumberFormatException ignored) {
                }
            }
        }

        return health.build();
    }
}
