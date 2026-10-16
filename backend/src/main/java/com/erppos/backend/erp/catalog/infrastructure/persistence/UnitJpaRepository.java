package com.erppos.backend.erp.catalog.infrastructure.persistence;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
public interface UnitJpaRepository extends JpaRepository<UnitEntity, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from UnitEntity u where u.id = :id")
    Optional<UnitEntity> findByIdForUpdate(@Param("id") Long id);
    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
    List<UnitEntity> findAllByOrderByCodeAsc();
}
