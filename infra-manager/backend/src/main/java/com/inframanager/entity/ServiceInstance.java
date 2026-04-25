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
@Table(name = "service_instances", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"allocation_id", "instance_index"})
})
public class ServiceInstance {

    public enum Status {
        RUNNING, STOPPED, STARTING, STOPPING, ERROR
    }

    public enum HealthStatus {
        UP, DOWN, UNKNOWN, OUT_OF_SERVICE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "allocation_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ServiceAllocation allocation;

    @Column(name = "instance_index", nullable = false)
    private Integer instanceIndex;

    @Column(name = "port", nullable = false)
    private Integer port;

    @Column(name = "pid")
    private Integer pid;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private Status status;

    @Column(name = "eureka_registered")
    private Boolean eurekaRegistered;

    @Column(name = "eureka_instance_id", length = 200)
    private String eurekaInstanceId;

    @Column(name = "deploy_path", length = 500)
    private String deployPath;

    @Column(name = "jvm_args", columnDefinition = "TEXT")
    private String jvmArgs;

    @Column(name = "last_health_check")
    private LocalDateTime lastHealthCheck;

    @Enumerated(EnumType.STRING)
    @Column(name = "health_status", length = 20)
    private HealthStatus healthStatus;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "stopped_at")
    private LocalDateTime stoppedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
