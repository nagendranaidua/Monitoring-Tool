package com.inframanager.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "servers")
public class Server {

    public enum Status {
        ACTIVE, INACTIVE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Application application;

    @Column(name = "server_name", nullable = false, length = 200)
    private String serverName;

    @Column(name = "alias", length = 100)
    private String alias;

    @Column(name = "ip_address", nullable = false, length = 45)
    private String ipAddress;

    @Column(name = "environment", nullable = false, length = 50)
    private String environment;

    @Column(name = "datacenter", length = 100)
    private String datacenter;

    @Column(name = "zone", length = 10)
    private String zone;

    @Column(name = "os_type", length = 30)
    private String osType;

    @Column(name = "os_version", length = 30)
    private String osVersion;

    @Column(name = "server_type", length = 100)
    private String serverType;

    @Column(name = "cpu_count")
    private Integer cpuCount;

    @Column(name = "cpu_cores")
    private Integer cpuCores;

    @Column(name = "ram_gb")
    private Integer ramGb;

    @Column(name = "disk_size", length = 50)
    private String diskSize;

    @Column(name = "software", length = 100)
    private String software;

    @Column(name = "ssh_username", length = 100)
    private String sshUsername;

    @Column(name = "ssh_password_enc", length = 500)
    private String sshPasswordEnc;

    @Column(name = "ssh_port")
    private Integer sshPort;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "tadp_hostname", length = 200)
    private String tadpHostname;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private Status status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
