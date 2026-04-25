package com.erppos.backend.erp.security.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserJpaRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByUsernameIgnoreCaseOrEmailIgnoreCase(String username, String email);
}

