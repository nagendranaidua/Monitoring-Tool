package com.inframanager.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "service_allocations", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"server_id", "service_id"})
})
public class ServiceAllocation {

    public enum Status {
        PLANNED, ACTIVE, INACTIVE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "server_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Server server;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Microservice service;

    @Column(name = "planned_instance_count")
    private Integer plannedInstanceCount;

    @Column(name = "deploy_path", length = 500)
    private String deployPath;

    @Column(name = "config_overrides", columnDefinition = "jsonb")
    private String configOverrides;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private Status status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "allocation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<ServiceInstance> instances = new ArrayList<>();
}
