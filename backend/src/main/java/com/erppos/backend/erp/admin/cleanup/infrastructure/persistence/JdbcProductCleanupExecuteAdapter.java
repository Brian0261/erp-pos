package com.erppos.backend.erp.admin.cleanup.infrastructure.persistence;

import com.erppos.backend.erp.admin.cleanup.domain.port.ProductCleanupExecutePort;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class JdbcProductCleanupExecuteAdapter implements ProductCleanupExecutePort {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public JdbcProductCleanupExecuteAdapter(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
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
