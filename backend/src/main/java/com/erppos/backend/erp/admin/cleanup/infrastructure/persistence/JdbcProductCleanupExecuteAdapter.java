package com.erppos.backend.erp.admin.cleanup.infrastructure.persistence;

import com.erppos.backend.erp.admin.cleanup.domain.port.ProductCleanupExecutePort;
import com.erppos.backend.erp.admin.cleanup.domain.exception.CleanupBusinessRuleException;
import com.erppos.backend.erp.sales.domain.port.CommercialOperationCoordinationPort;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class JdbcProductCleanupExecuteAdapter implements ProductCleanupExecutePort {

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final CommercialOperationCoordinationPort operationCoordinationPort;

    public JdbcProductCleanupExecuteAdapter(NamedParameterJdbcTemplate jdbcTemplate,
                                           CommercialOperationCoordinationPort operationCoordinationPort) {
        this.jdbcTemplate = jdbcTemplate;
        this.operationCoordinationPort = operationCoordinationPort;
    }

    @Override
    public void lockCleanupTargets(Set<Long> productIds, Set<Long> saleIds) {
        jdbcTemplate.getJdbcTemplate().execute("set local lock_timeout = '3s'");
        if (productIds.isEmpty()) return;
        var products = new MapSqlParameterSource("productIds", productIds);
        // Quote conversion owns the quote before it acquires an operation/cash/sale.
        jdbcTemplate.queryForList("""
                select q.id from quotes q where q.id in
                    (select qi.quote_id from quote_items qi where qi.product_id in (:productIds))
                order by q.id for update
                """, products);
        operationCoordinationPort.lockForSales(saleIds.stream().sorted().toList());
        if (!saleIds.isEmpty()) {
            var sales = new MapSqlParameterSource("ids", saleIds);
            jdbcTemplate.queryForList("""
                    select c.id from cash_register_sessions c where c.id in
                        (select s.cash_register_session_id from sales s where s.id in (:ids))
                    order by c.id for update
                    """, sales);
            jdbcTemplate.queryForList("select s.id from sales s where s.id in (:ids) order by s.id for update", sales);
            jdbcTemplate.queryForList("select d.id from electronic_documents d where d.sale_id in (:ids) order by d.id for update", sales);
            Integer linkedQuotes = jdbcTemplate.queryForObject(
                    "select count(*) from quotes where converted_sale_id in (:ids)", sales, Integer.class);
            if (linkedQuotes != null && linkedQuotes > 0) {
                throw new CleanupBusinessRuleException("Converted quote history blocks purge; no operation identity can be reused.");
            }
        }
        jdbcTemplate.queryForList("select p.id from products p where p.id in (:productIds) order by p.id for update", products);
    }

    @Override
    public int deleteSaleItemsBySaleIds(Set<Long> saleIds) {
        return deleteByIds("delete from sale_items where sale_id in (:ids)", saleIds);
    }

    @Override
    public int deleteSalePaymentsBySaleIds(Set<Long> saleIds) {
        return deleteByIds("delete from sale_payments where sale_id in (:ids)", saleIds);
    }

    @Override
    public int deleteQuoteItemsByProductIds(Set<Long> productIds) {
        return deleteByProductIds("delete from quote_items where product_id in (:productIds)", productIds);
    }

    @Override
    public int deletePurchaseReceiptItemsByIds(Set<Long> purchaseReceiptIds) {
        return deleteByIds("delete from purchase_receipt_items where purchase_receipt_id in (:ids)", purchaseReceiptIds);
    }

    @Override
    public int deletePurchaseReceiptsByIds(Set<Long> purchaseReceiptIds) {
        return deleteByIds("delete from purchase_receipts where id in (:ids)", purchaseReceiptIds);
    }

    @Override
    public int deletePurchaseOrderItemsByIds(Set<Long> purchaseOrderIds) {
        return deleteByIds("delete from purchase_order_items where purchase_order_id in (:ids)", purchaseOrderIds);
    }

    @Override
    public int deletePurchaseOrdersByIds(Set<Long> purchaseOrderIds) {
        return deleteByIds("delete from purchase_orders where id in (:ids)", purchaseOrderIds);
    }

    @Override
    public int deleteStockTransferItemsByProductIds(Set<Long> productIds) {
        return deleteByProductIds("delete from stock_transfer_items where product_id in (:productIds)", productIds);
    }

    @Override
    public int deleteStockBalancesByProductIds(Set<Long> productIds) {
        return deleteByProductIds("delete from stock_balances where product_id in (:productIds)", productIds);
    }

    @Override
    public int deleteInventoryMovementsByProductIds(Set<Long> productIds) {
        return deleteByProductIds("delete from inventory_movements where product_id in (:productIds)", productIds);
    }

    @Override
    public int deleteSalesByIds(Set<Long> saleIds) {
        if (!saleIds.isEmpty()) {
            // A purged result can no longer create its pending document. Keep only identity/fingerprints.
            jdbcTemplate.update("""
                    update sale_operations set command_snapshot=null,quote_snapshot=null,
                        receipt_intent=case when receipt_intent is null then null else
                            jsonb_build_object('receiptType',receipt_intent->>'receiptType','payload',null) end,
                        updated_at=current_timestamp where sale_id in (:ids)
                    """,new MapSqlParameterSource("ids",saleIds));
        }
        return deleteByIds("delete from sales where id in (:ids)", saleIds);
    }

    @Override
    public int deleteProductsByIds(Set<Long> productIds) {
        return deleteByIds("delete from products where id in (:ids)", productIds);
    }

    private int deleteByProductIds(String sql, Set<Long> productIds) {
        if (productIds.isEmpty()) {
            return 0;
        }
        return jdbcTemplate.update(sql, new MapSqlParameterSource("productIds", productIds));
    }

    private int deleteByIds(String sql, Set<Long> ids) {
        if (ids.isEmpty()) {
            return 0;
        }
        return jdbcTemplate.update(sql, new MapSqlParameterSource("ids", ids));
    }
}
