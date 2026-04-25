package com.erppos.backend.erp.security.infrastructure.persistence;

import com.erppos.backend.erp.security.domain.RoleName;
import jakarta.persistence.*;

@Entity
@Table(name = "roles")
public class RoleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "name", nullable = false, unique = true, length = 30)
    private RoleName name;

    public Long getId() {
        return id;
    }

    public RoleName getName() {
        return name;
    }

    public void setName(RoleName name) {
        this.name = name;
    }
}

