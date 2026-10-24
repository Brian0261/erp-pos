package com.erppos.backend.erp.sales.infrastructure.persistence;

import com.erppos.backend.erp.sales.domain.port.SaleOperationPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Optional;
import java.util.UUID;

@Component
@Transactional(propagation = Propagation.MANDATORY)
public class SaleOperationAdapter implements SaleOperationPort {
    private final JdbcTemplate jdbc;
    public SaleOperationAdapter(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @Override public void lock(UUID actorId, UUID operationId) {
        jdbc.queryForObject("select set_config('lock_timeout', '5s', true)", String.class);
        try {
            long key = ByteBuffer.wrap(MessageDigest.getInstance("SHA-256")
                    .digest((actorId + ":" + operationId).getBytes(StandardCharsets.UTF_8))).getLong();
            // Hash collisions serialize unrelated operations; persisted full UUID identity remains authoritative.
            jdbc.queryForList("select pg_advisory_xact_lock(?)", key);
            jdbc.queryForList("select operation_id from sale_operations where actor_user_id=? and operation_id=? for update", actorId, operationId);
        } catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
        catch (org.springframework.dao.DataAccessException ex) {
            for(Throwable cause=ex;cause!=null;cause=cause.getCause()) {
                if(cause instanceof java.sql.SQLException sql && java.util.Set.of("55P03","40P01","57014").contains(sql.getSQLState()))
                    throw new com.erppos.backend.erp.sales.domain.exception.SaleOperationConflictException(
                            "OPERATION_BUSY","Operation resources are busy. Consult the same identity before retrying.");
            }
            throw ex;
        }
    }
    @Override public Optional<CompletedOperation> find(UUID actorId, UUID operationId) {
        return jdbc.query("select request_hash, sale_id from sale_operations where actor_user_id=? and operation_id=? and state='COMPLETED'",
                (rs, n) -> new CompletedOperation(rs.getString(1), rs.getObject(2, Long.class)), actorId, operationId).stream().findFirst();
    }
    @Override public void complete(UUID actorId, UUID operationId, String hash, Long saleId) {
        java.util.Objects.requireNonNull(saleId, "Only an existing sale can complete an operation");
        int changed = jdbc.update("""
                update sale_operations set sale_id=?, state='COMPLETED', command_snapshot=null,
                    quote_snapshot=null, updated_at=current_timestamp
                where actor_user_id=? and operation_id=? and state='PREPARED' and request_hash=?
                """, saleId, actorId, operationId, hash);
        if (changed != 1) throw new com.erppos.backend.erp.sales.domain.exception.SaleOperationConflictException(
                "OPERATION_PREPARATION_REQUIRED", "A matching preparation is required");
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization(){
                    @Override public void afterCommit(){org.slf4j.LoggerFactory.getLogger(SaleOperationAdapter.class).info(
                            "sale_operation actor={} operation={} transition=COMPLETED result={} at={}",actorId,operationId,saleId,java.time.Instant.now());}
                });
    }
    @Override public Long preparedCashSession(UUID actorId, UUID operationId, String hash) {
        var rows=jdbc.queryForList("select state,request_hash,original_cash_session_id from sale_operations where actor_user_id=? and operation_id=?",actorId,operationId);
        if(rows.isEmpty()) throw new com.erppos.backend.erp.sales.domain.exception.SaleOperationConflictException(
                "OPERATION_PREPARATION_REQUIRED","Prepare the operation before checkout");
        var row=rows.get(0);
        if(!"PREPARED".equals(row.get("state"))) throw new com.erppos.backend.erp.sales.domain.exception.SaleOperationConflictException(
                "OPERATION_CANCELLED","This identity is terminal and cannot be executed");
        if(!hash.equals(row.get("request_hash"))) throw new com.erppos.backend.erp.sales.domain.exception.SaleOperationConflictException(
                "OPERATION_CONTENT_MISMATCH","The frozen command differs");
        return ((Number)row.get("original_cash_session_id")).longValue();
    }
    @Override public void lockForSale(Long saleId) {
        for(var row:jdbc.queryForList("select actor_user_id,operation_id from sale_operations where sale_id=? order by actor_user_id,operation_id",saleId))
            lock((UUID)row.get("actor_user_id"),(UUID)row.get("operation_id"));
    }
}
