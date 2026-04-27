package com.erppos.backend.erp.integrations.infrastructure.persistence;

import com.erppos.backend.erp.integrations.domain.model.OutboxEventStatus;
import com.erppos.backend.erp.integrations.domain.model.OutboxEventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface OutboxEventJpaRepository extends JpaRepository<OutboxEventEntity, Long> {

    @Query("""
            select e from OutboxEventEntity e
            where (:status is null or e.status = :status)
              and (:eventType is null or e.eventType = :eventType)
            order by e.createdAt desc
            """)
    List<OutboxEventEntity> findByFilters(OutboxEventStatus status, OutboxEventType eventType);
}

