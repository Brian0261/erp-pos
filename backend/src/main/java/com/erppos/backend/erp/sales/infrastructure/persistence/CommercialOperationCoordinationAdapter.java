package com.erppos.backend.erp.sales.infrastructure.persistence;

import com.erppos.backend.erp.sales.domain.port.CommercialOperationCoordinationPort;
import com.erppos.backend.erp.sales.domain.port.SaleOperationPort;
import com.erppos.backend.erp.sales.domain.exception.SaleOperationConflictException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Component
@Transactional(propagation=Propagation.MANDATORY)
public class CommercialOperationCoordinationAdapter implements CommercialOperationCoordinationPort {
    private final JdbcTemplate jdbc; private final SaleOperationPort operations; private final ObjectMapper json;
    public CommercialOperationCoordinationAdapter(JdbcTemplate jdbc,SaleOperationPort operations,ObjectMapper json){this.jdbc=jdbc;this.operations=operations;this.json=json;}
    @Override public void lockForSale(Long saleId){lockForSales(List.of(saleId));}
    @Override public void lockForSales(List<Long> ids){
        if(ids.isEmpty())return;
        String marks=String.join(",",Collections.nCopies(ids.size(),"?"));
        var rows=jdbc.queryForList("select actor_user_id,operation_id from sale_operations where sale_id in ("+marks+") order by actor_user_id,operation_id",ids.toArray());
        for(var row:rows)operations.lock((UUID)row.get("actor_user_id"),(UUID)row.get("operation_id"));
    }
    @Override public Optional<ReceiptIntent> receiptIntentForSale(Long saleId){
        return jdbc.query("""
                select o.actor_user_id,o.receipt_intent,d.document_type,d.billing_series_id,d.customer_name,d.customer_document
                from sale_operations o left join electronic_documents d on d.id=o.document_id
                where o.sale_id=? and o.protocol_version=1
                """,(rs,n)->{
            try{
                var intent=rs.getString("receipt_intent");var tree=intent==null?null:json.readTree(intent);
                var p=tree==null?null:tree.get("payload");boolean full=p!=null&&!p.isNull();
                return new ReceiptIntent(rs.getObject("actor_user_id",UUID.class),tree==null?null:tree.path("receiptType").asText(),
                        full?p.path("billingSeriesId").asLong():rs.getObject("billing_series_id",Long.class),
                        full?nullable(p.get("customerName")):rs.getString("customer_name"),
                        full?nullable(p.get("customerDocument")):rs.getString("customer_document"));
            }catch(Exception ex){throw new IllegalStateException("Invalid stored receipt intent",ex);}
        },saleId).stream().findFirst();
    }
    private String nullable(com.fasterxml.jackson.databind.JsonNode n){return n==null||n.isNull()?null:n.asText();}
    @Override public void linkDocument(Long saleId,Long documentId,String type,Long series,String name,String number){
        int mismatch=jdbc.queryForObject("select count(*) from sale_operations where sale_id=? and document_id is not null and document_id<>?",Integer.class,saleId,documentId);
        if(mismatch>0)throw new SaleOperationConflictException("OPERATION_DOCUMENT_REVIEW_REQUIRED","Document association differs");
        jdbc.update("""
                update sale_operations set document_id=?,
                    receipt_intent=case when receipt_intent is null then null else jsonb_build_object(
                        'receiptType',receipt_intent->>'receiptType','payload',null) end,
                    updated_at=current_timestamp where sale_id=? and state='COMPLETED' and protocol_version=1
                """,documentId,saleId);
    }
}
