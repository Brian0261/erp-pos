package com.erppos.backend.erp.sales.infrastructure.persistence;

import com.erppos.backend.erp.sales.domain.exception.SalesConflictException;
import com.erppos.backend.erp.sales.domain.model.PosProductSnapshot;
import com.erppos.backend.erp.sales.domain.port.CheckoutReadPort;
import com.erppos.backend.erp.shared.domain.policy.QuantityPolicy;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;

@Component
public class CheckoutReadAdapter implements CheckoutReadPort {
    private final NamedParameterJdbcTemplate jdbc;
    public CheckoutReadAdapter(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public List<PosProductSnapshot> lockCatalog(List<Long> ids) {
        if (ids.isEmpty()) return List.of();
        Map<String, Object> params = Map.of("ids", ids);
        jdbc.queryForList("select id from products where id in (:ids) order by id for share", params, Long.class);
        List<Long> units = jdbc.queryForList("select distinct unit_id from products where id in (:ids) order by unit_id", params, Long.class);
        if (!units.isEmpty()) {
            jdbc.queryForList("select id from units where id in (:ids) order by id for share", Map.of("ids", units), Long.class);
        }
        // JDBC projection after all locks deliberately bypasses Hibernate's first-level cache.
        return readCatalog(ids);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void lockStock(List<Long> ids, Long warehouseId) {
        if (ids.isEmpty()) return;
        try {
            // Existing transfer paths may lock stock in input order. Never wait while holding a partial checkout set.
            jdbc.queryForList("""
                    select id from stock_balances where product_id in (:ids) and warehouse_id = :warehouse
                    order by product_id, warehouse_id for update nowait
                    """, Map.of("ids", ids, "warehouse", warehouseId), Long.class);
        } catch (DataAccessException ex) {
            for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
                if (cause instanceof java.sql.SQLException sql && "55P03".equals(sql.getSQLState()))
                    throw new SalesConflictException("Inventory is being updated; review availability and retry the same operation");
            }
            throw ex;
        }
    }

    private List<PosProductSnapshot> readCatalog(List<Long> ids) {
        if (ids.isEmpty()) return List.of();
        return jdbc.query("""
                select p.id, p.sku, p.barcode, p.name, p.sale_price, p.active, u.active unit_active, u.quantity_policy
                from products p join units u on u.id = p.unit_id where p.id in (:ids) order by p.id
                """, Map.of("ids", ids), (rs, n) -> new PosProductSnapshot(rs.getLong("id"), rs.getString("sku"),
                rs.getString("barcode"), rs.getString("name"), rs.getBigDecimal("sale_price"),
                QuantityPolicy.fromStorage(rs.getString("quantity_policy")),
                rs.getBoolean("active") && rs.getBoolean("unit_active")));
    }

    @Override
    public List<com.erppos.backend.erp.sales.domain.model.PosProductView> snapshot(List<Long> ids, Long warehouseId) {
        if (ids.isEmpty()) return List.of();
        return jdbc.query("""
                select p.id, p.sku, p.barcode, p.name, p.sale_price, u.quantity_policy, coalesce(s.quantity, 0) stock
                from products p join units u on u.id=p.unit_id
                left join stock_balances s on s.product_id=p.id and s.warehouse_id=:warehouse
                where p.id in (:ids) and p.active and u.active order by p.id
                """, Map.of("ids", ids, "warehouse", warehouseId), (rs, n) ->
                new com.erppos.backend.erp.sales.domain.model.PosProductView(rs.getLong("id"), rs.getString("sku"),
                        rs.getString("barcode"), rs.getString("name"), rs.getBigDecimal("sale_price"),
                        QuantityPolicy.fromStorage(rs.getString("quantity_policy")), rs.getBigDecimal("stock")));
    }
}
