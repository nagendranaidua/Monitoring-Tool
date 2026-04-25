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

    @Column(name = "machine_name", nullable = false, length = 100)
    private String machineName;

    @Column(name = "alias", length = 100)
    private String alias;

    @Column(name = "ip_address", nullable = false, length = 45)
    private String ipAddress;

    @Column(name = "environment", nullable = false, length = 30)
    private String environment;

    @Column(name = "availability_zone", length = 10)
    private String availabilityZone;

    @Column(name = "datacenter", length = 50)
    private String datacenter;

    @Column(name = "os", length = 30)
    private String os;

    @Column(name = "vm_server")
    private Boolean vmServer;

    @Column(name = "vm_type", length = 30)
    private String vmType;

    @Column(name = "os_version", length = 30)
    private String osVersion;

    @Column(name = "cpu")
    private Integer cpu;

    @Column(name = "ram", length = 20)
    private String ram;

    @Column(name = "disk", length = 20)
    private String disk;

    @Column(name = "usage_role", length = 50)
    private String usageRole;

    @Column(name = "is_app_server")
    private Boolean isAppServer;

    @Column(name = "ssh_username", length = 100)
    private String sshUsername;

    @Column(name = "ssh_password_enc", length = 500)
    private String sshPasswordEnc;

    @Column(name = "ssh_port")
    private Integer sshPort;

    @Column(name = "remark", columnDefinition = "TEXT")
    private String remark;

    @Column(name = "tadp_hostname", length = 200)
    private String tadpHostname;

    @Column(name = "tadp_ref", length = 100)
    private String tadpRef;

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
