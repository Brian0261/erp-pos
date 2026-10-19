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
        try {
            long key = ByteBuffer.wrap(MessageDigest.getInstance("SHA-256")
                    .digest((actorId + ":" + operationId).getBytes(StandardCharsets.UTF_8))).getLong();
            // Hash collisions serialize unrelated operations; persisted full UUID identity remains authoritative.
            jdbc.queryForList("select pg_advisory_xact_lock(?)", key);
        } catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
    @Override public Optional<CompletedOperation> find(UUID actorId, UUID operationId) {
        return jdbc.query("select request_hash, sale_id from sale_operations where actor_user_id=? and operation_id=?",
                (rs, n) -> new CompletedOperation(rs.getString(1), rs.getObject(2, Long.class)), actorId, operationId).stream().findFirst();
    }
    @Override public void complete(UUID actorId, UUID operationId, String hash, Long saleId) {
        java.util.Objects.requireNonNull(saleId, "Only an existing sale can complete an operation");
        jdbc.update("insert into sale_operations(actor_user_id, operation_id, request_hash, sale_id) values (?,?,?,?)",
                actorId, operationId, hash, saleId);
    }
}
