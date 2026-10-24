package com.erppos.backend.erp.sales.infrastructure.persistence;

import com.erppos.backend.erp.sales.domain.port.SaleOperationRecoveryPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@Transactional(propagation = Propagation.MANDATORY)
public class SaleOperationRecoveryAdapter implements SaleOperationRecoveryPort {
    private final JdbcTemplate jdbc;
    public SaleOperationRecoveryAdapter(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    private static final String SELECT = """
            select o.*, d.status as document_status from sale_operations o
            left join electronic_documents d on d.id=o.document_id
            """;
    private static final RowMapper<Operation> ROW = (rs, n) -> new Operation(
            rs.getObject("actor_user_id", UUID.class), rs.getObject("operation_id", UUID.class),
            rs.getInt("protocol_version"), rs.getString("origin"), rs.getString("state"),
            rs.getString("request_hash"), rs.getString("intent_hash"), rs.getObject("original_cash_session_id", Long.class),
            rs.getObject("sale_id", Long.class), rs.getObject("quote_id", Long.class), rs.getString("command_snapshot"),
            rs.getString("quote_snapshot"), rs.getString("receipt_intent"), rs.getObject("document_id", Long.class),
            rs.getString("document_status"), rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
    @Override public Optional<Operation> findOwned(UUID actor, UUID id) {
        return jdbc.query(SELECT + " where o.actor_user_id=? and o.operation_id=?", ROW, actor, id).stream().findFirst();
    }
    private String filter(String state, boolean attention) {
        return " where o.actor_user_id=?" + (state == null ? "" : " and o.state=?")
                + (attention ? " and (o.state='PREPARED' or (o.state='COMPLETED' and (o.sale_id is null or (o.receipt_intent->>'receiptType' in ('RECEIPT','INVOICE') and o.document_id is null))))" : "");
    }
    @Override public List<Operation> listOwned(UUID actor, String state, boolean attention, int offset, int size) {
        var args = new java.util.ArrayList<Object>(); args.add(actor); if (state != null) args.add(state); args.add(size); args.add(offset);
        return jdbc.query(SELECT + filter(state, attention) + " order by o.created_at desc, o.operation_id limit ? offset ?", ROW, args.toArray());
    }
    @Override public long countOwned(UUID actor, String state, boolean attention) {
        Object[] args = state == null ? new Object[]{actor} : new Object[]{actor, state};
        return jdbc.queryForObject("select count(*) from sale_operations o" + filter(state, attention), Long.class, args);
    }
    @Override public void prepare(Operation o) {
        jdbc.update("""
                insert into sale_operations(actor_user_id,operation_id,request_hash,protocol_version,origin,state,
                    command_snapshot,quote_id,quote_snapshot,receipt_intent,intent_hash,original_cash_session_id)
                values(?,?,?,1,?,'PREPARED',?::jsonb,?,?::jsonb,?::jsonb,?,?)
                """, o.actorId(), o.operationId(), o.requestHash(), o.origin(), o.commandSnapshot(), o.quoteId(),
                o.quoteSnapshot(), o.receiptIntent(), o.intentHash(), o.cashSessionId());
    }
    @Override public void cancel(UUID actor, UUID id) {
        jdbc.update("""
                update sale_operations set state='CANCELLED', command_snapshot=null,quote_snapshot=null,
                    receipt_intent=case when receipt_intent is null then null
                        else jsonb_build_object('receiptType', receipt_intent->>'receiptType', 'payload',null) end,
                    updated_at=current_timestamp where actor_user_id=? and operation_id=? and state='PREPARED'
                """, actor, id);
    }
}
