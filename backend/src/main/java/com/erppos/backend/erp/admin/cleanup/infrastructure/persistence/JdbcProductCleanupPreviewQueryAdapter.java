package com.erppos.backend.erp.admin.cleanup.infrastructure.persistence;

import com.erppos.backend.erp.admin.cleanup.domain.port.ProductCleanupPreviewQueryPort;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class JdbcProductCleanupPreviewQueryAdapter implements ProductCleanupPreviewQueryPort {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public JdbcProductCleanupPreviewQueryAdapter(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<ProductRow> findProducts(Set<Long> productIds, Set<String> normalizedSkus) {
        StringBuilder sql = new StringBuilder(
                "select p.id, p.sku, p.barcode, p.name, p.active from products p where 1 = 0"
        );
        MapSqlParameterSource params = new MapSqlParameterSource();
        if (!productIds.isEmpty()) {
            sql.append(" or p.id in (:productIds)");
            params.addValue("productIds", productIds);
        }
        if (!normalizedSkus.isEmpty()) {
            sql.append(" or lower(p.sku) in (:skus)");
            params.addValue("skus", normalizedSkus);
        }
        sql.append(" order by p.id");

        return jdbcTemplate.query(sql.toString(), params, (rs, rowNum) -> new ProductRow(
                rs.getLong("id"),
                rs.getString("sku"),
                rs.getString("barcode"),
                rs.getString("name"),
                rs.getBoolean("active")
        ));
    }

    @Override
    public List<SaleRow> findSalesByProductIds(Set<Long> productIds) {
        return queryByProductIds(
                """
                        select distinct s.id, s.sale_number, s.status, s.subtotal_amount, s.discount_amount,
                               s.total_amount, s.paid_amount, s.change_amount
                        from sales s
                        join sale_items si on si.sale_id = s.id
                        where si.product_id in (:productIds)
                        order by s.id
                        """,
                productIds,
                (rs, rowNum) -> new SaleRow(
                        rs.getLong("id"),
                        rs.getString("sale_number"),
                        rs.getString("status"),
                        rs.getBigDecimal("subtotal_amount"),
                        rs.getBigDecimal("discount_amount"),
                        rs.getBigDecimal("total_amount"),
                        rs.getBigDecimal("paid_amount"),
                        rs.getBigDecimal("change_amount")
                )
        );
    }

    @Override
    public List<SaleItemRow> findSaleItemsBySaleIds(Set<Long> saleIds) {
        return queryByIds(
                """
                        select id, sale_id, product_id, quantity, unit_price, discount_amount, line_total
                        from sale_items
                        where sale_id in (:ids)
                        order by sale_id, id
                        """,
                saleIds,
                (rs, rowNum) -> new SaleItemRow(
                        rs.getLong("id"),
                        rs.getLong("sale_id"),
                        rs.getLong("product_id"),
                        rs.getBigDecimal("quantity"),
                        rs.getBigDecimal("unit_price"),
                        rs.getBigDecimal("discount_amount"),
                        rs.getBigDecimal("line_total")
                )
        );
    }

    @Override
    public List<SalePaymentRow> findSalePaymentsBySaleIds(Set<Long> saleIds) {
        return queryByIds(
                """
                        select id, sale_id, payment_method, amount, reference
                        from sale_payments
                        where sale_id in (:ids)
                        order by sale_id, id
                        """,
                saleIds,
                (rs, rowNum) -> new SalePaymentRow(
                        rs.getLong("id"),
                        rs.getLong("sale_id"),
                        rs.getString("payment_method"),
                        rs.getBigDecimal("amount"),
                        rs.getString("reference")
                )
        );
    }

    @Override
    public List<StockBalanceRow> findStockBalancesByProductIds(Set<Long> productIds) {
        return queryByProductIds(
                """
                        select id, product_id, warehouse_id, quantity
                        from stock_balances
                        where product_id in (:productIds)
                        order by product_id, id
                        """,
                productIds,
                (rs, rowNum) -> new StockBalanceRow(
                        rs.getLong("id"),
                        rs.getLong("product_id"),
                        rs.getLong("warehouse_id"),
                        rs.getBigDecimal("quantity")
                )
        );
    }

    @Override
    public List<InventoryMovementRow> findInventoryMovementsByProductIds(Set<Long> productIds) {
        return queryByProductIds(
                """
                        select id, product_id, warehouse_id, movement_type, quantity, previous_stock, new_stock,
                               reason, reference_type, reference_id
                        from inventory_movements
                        where product_id in (:productIds)
                        order by product_id, id
                        """,
                productIds,
                (rs, rowNum) -> new InventoryMovementRow(
                        rs.getLong("id"),
                        rs.getLong("product_id"),
                        rs.getLong("warehouse_id"),
                        rs.getString("movement_type"),
                        rs.getBigDecimal("quantity"),
                        rs.getBigDecimal("previous_stock"),
                        rs.getBigDecimal("new_stock"),
                        rs.getString("reason"),
                        rs.getString("reference_type"),
                        rs.getString("reference_id")
                )
        );
    }

    @Override
    public List<StockTransferItemRow> findStockTransferItemsByProductIds(Set<Long> productIds) {
        return queryByProductIds(
                """
                        select id, transfer_id, product_id, quantity
                        from stock_transfer_items
                        where product_id in (:productIds)
                        order by product_id, id
                        """,
                productIds,
                (rs, rowNum) -> new StockTransferItemRow(
                        rs.getLong("id"),
                        rs.getLong("transfer_id"),
                        rs.getLong("product_id"),
                        rs.getBigDecimal("quantity")
                )
        );
    }

    @Override
    public List<QuoteItemRow> findQuoteItemsByProductIds(Set<Long> productIds) {
        return queryByProductIds(
                """
                        select qi.id, qi.quote_id, q.quote_number, q.status, q.converted_sale_id,
                               qi.product_id, qi.quantity, qi.unit_price, qi.discount_amount, qi.line_total
                        from quote_items qi
                        join quotes q on q.id = qi.quote_id
                        where qi.product_id in (:productIds)
                        order by qi.product_id, qi.id
                        """,
                productIds,
                (rs, rowNum) -> new QuoteItemRow(
                        rs.getLong("id"),
                        rs.getLong("quote_id"),
                        rs.getString("quote_number"),
                        rs.getString("status"),
                        rs.getObject("converted_sale_id", Long.class),
                        rs.getLong("product_id"),
                        rs.getBigDecimal("quantity"),
                        rs.getBigDecimal("unit_price"),
                        rs.getBigDecimal("discount_amount"),
                        rs.getBigDecimal("line_total")
                )
        );
    }

    @Override
    public List<PurchaseOrderItemRow> findPurchaseOrderItemsByProductIds(Set<Long> productIds) {
        return queryByProductIds(
                """
                        select poi.id, poi.purchase_order_id, po.status, poi.product_id,
                               poi.quantity_ordered, poi.quantity_received, poi.line_total
                        from purchase_order_items poi
                        join purchase_orders po on po.id = poi.purchase_order_id
                        where poi.product_id in (:productIds)
                        order by poi.product_id, poi.id
                        """,
                productIds,
                (rs, rowNum) -> new PurchaseOrderItemRow(
                        rs.getLong("id"),
                        rs.getLong("purchase_order_id"),
                        rs.getString("status"),
                        rs.getLong("product_id"),
                        rs.getBigDecimal("quantity_ordered"),
                        rs.getBigDecimal("quantity_received"),
                        rs.getBigDecimal("line_total")
                )
        );
    }

    @Override
    public List<PurchaseOrderItemRow> findPurchaseOrderItemsByPurchaseOrderIds(Set<Long> purchaseOrderIds) {
        return queryByIds(
                """
                        select poi.id, poi.purchase_order_id, po.status, poi.product_id,
                               poi.quantity_ordered, poi.quantity_received, poi.line_total
                        from purchase_order_items poi
                        join purchase_orders po on po.id = poi.purchase_order_id
                        where poi.purchase_order_id in (:ids)
                        order by poi.purchase_order_id, poi.id
                        """,
                purchaseOrderIds,
                (rs, rowNum) -> new PurchaseOrderItemRow(
                        rs.getLong("id"),
                        rs.getLong("purchase_order_id"),
                        rs.getString("status"),
                        rs.getLong("product_id"),
                        rs.getBigDecimal("quantity_ordered"),
                        rs.getBigDecimal("quantity_received"),
                        rs.getBigDecimal("line_total")
                )
        );
    }

    @Override
    public List<PurchaseReceiptItemRow> findPurchaseReceiptItemsByProductIds(Set<Long> productIds) {
        return queryByProductIds(
                """
                        select pri.id, pri.purchase_receipt_id, pr.purchase_order_id, pri.purchase_order_item_id,
                               pri.product_id, pri.quantity_received
                        from purchase_receipt_items pri
                        join purchase_receipts pr on pr.id = pri.purchase_receipt_id
                        where pri.product_id in (:productIds)
                        order by pri.product_id, pri.id
                        """,
                productIds,
                (rs, rowNum) -> new PurchaseReceiptItemRow(
                        rs.getLong("id"),
                        rs.getLong("purchase_receipt_id"),
                        rs.getLong("purchase_order_id"),
                        rs.getLong("purchase_order_item_id"),
                        rs.getLong("product_id"),
                        rs.getBigDecimal("quantity_received")
                )
        );
    }

    @Override
    public List<PurchaseReceiptItemRow> findPurchaseReceiptItemsByPurchaseReceiptIds(Set<Long> purchaseReceiptIds) {
        return queryByIds(
                """
                        select pri.id, pri.purchase_receipt_id, pr.purchase_order_id, pri.purchase_order_item_id,
                               pri.product_id, pri.quantity_received
                        from purchase_receipt_items pri
                        join purchase_receipts pr on pr.id = pri.purchase_receipt_id
                        where pri.purchase_receipt_id in (:ids)
                        order by pri.purchase_receipt_id, pri.id
                        """,
                purchaseReceiptIds,
                (rs, rowNum) -> new PurchaseReceiptItemRow(
                        rs.getLong("id"),
                        rs.getLong("purchase_receipt_id"),
                        rs.getLong("purchase_order_id"),
                        rs.getLong("purchase_order_item_id"),
                        rs.getLong("product_id"),
                        rs.getBigDecimal("quantity_received")
                )
        );
    }

    @Override
    public List<ElectronicDocumentItemRow> findElectronicDocumentItemsByProductIds(Set<Long> productIds) {
        return queryByProductIds(
                """
                        select edi.id, edi.electronic_document_id, ed.sale_id, ed.full_number, ed.status,
                               edi.product_id, edi.description, edi.line_total
                        from electronic_document_items edi
                        join electronic_documents ed on ed.id = edi.electronic_document_id
                        where edi.product_id in (:productIds)
                        order by edi.product_id, edi.id
                        """,
                productIds,
                (rs, rowNum) -> new ElectronicDocumentItemRow(
                        rs.getLong("id"),
                        rs.getLong("electronic_document_id"),
                        rs.getLong("sale_id"),
                        rs.getString("full_number"),
                        rs.getString("status"),
                        rs.getLong("product_id"),
                        rs.getString("description"),
                        rs.getBigDecimal("line_total")
                )
        );
    }

    private <T> List<T> queryByProductIds(String sql, Set<Long> productIds, RowMapper<T> mapper) {
        if (productIds.isEmpty()) {
            return List.of();
        }
        return jdbcTemplate.query(sql, new MapSqlParameterSource("productIds", productIds), mapper);
    }

    private <T> List<T> queryByIds(String sql, Set<Long> ids, RowMapper<T> mapper) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return jdbcTemplate.query(sql, new MapSqlParameterSource("ids", ids), mapper);
    }
}
