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
@Table(name = "services", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"application_id", "name"})
})
public class Microservice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Application application;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "jar_name", length = 200)
    private String jarName;

    @Column(name = "version", length = 30)
    private String version;

    @Column(name = "start_script", length = 500)
    private String startScript;

    @Column(name = "stop_script", length = 500)
    private String stopScript;

    @Column(name = "health_check_script", length = 500)
    private String healthCheckScript;

    @Column(name = "eureka_service_name", length = 100)
    private String eurekaServiceName;

    @Column(name = "base_port")
    private Integer basePort;

    @Column(name = "active")
    private Boolean active;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
