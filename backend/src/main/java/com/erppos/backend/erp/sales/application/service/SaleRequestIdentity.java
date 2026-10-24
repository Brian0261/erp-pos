package com.erppos.backend.erp.sales.application.service;

import com.erppos.backend.erp.sales.application.usecase.CreateSaleCommand;
import com.erppos.backend.erp.sales.domain.exception.SalesBusinessRuleException;
import com.erppos.backend.erp.shared.domain.policy.CommercialMoneyPolicy;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.HexFormat;

final class SaleRequestIdentity {
    private SaleRequestIdentity() {}
    static String hash(CreateSaleCommand command) {
        if (command.operationId() == null) throw new SalesBusinessRuleException("operationId is required");
        if (command.warehouseId() == null) throw new SalesBusinessRuleException("warehouseId is required");
        if (command.items() == null || command.items().isEmpty()) throw new SalesBusinessRuleException("Sale must include at least one item");
        if (command.payments() == null || command.payments().isEmpty()) throw new SalesBusinessRuleException("Sale must include at least one payment");
        if (command.payments().stream().anyMatch(java.util.Objects::isNull)) throw new SalesBusinessRuleException("Payment line is required");
        if (command.source() == null || command.source().isBlank()) throw new SalesBusinessRuleException("Operation source is required");
        if (command.items().stream().anyMatch(i -> i == null || i.productId() == null)) throw new SalesBusinessRuleException("productId is required");
        StringBuilder out = new StringBuilder();
        add(out, "checkout-v1"); add(out, command.source()); add(out, command.warehouseId());
        add(out, money(command.confirmedTotal(), "confirmedTotal"));
        command.items().stream().sorted(Comparator.comparing(i -> i.productId())).forEach(i -> {
            if (i.productId() == null) throw new SalesBusinessRuleException("productId is required");
            add(out, i.productId()); add(out, quantity(i.quantity())); add(out, money(i.confirmedUnitPrice(), "confirmedUnitPrice"));
            add(out, money(i.discountAmount() == null ? BigDecimal.ZERO : i.discountAmount(), "discountAmount"));
        });
        // Payment order is not commercial identity. Include every line, including repeated equal lines.
        command.payments().stream().map(p -> {
            if (p.paymentMethod() == null) throw new SalesBusinessRuleException("paymentMethod is required");
            return p.paymentMethod().name() + "|" + money(p.amount(), "payment amount") + "|" + normalize(p.reference());
        }).sorted().forEach(p -> add(out, p));
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(out.toString().getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
    private static String money(BigDecimal value, String name) {
        return CommercialMoneyPolicy.nonNegative(value, name, SalesBusinessRuleException::new).toPlainString();
    }
    private static String quantity(BigDecimal value) {
        if (value == null || Math.abs((long)value.scale()) > 1000 || value.stripTrailingZeros().precision() > 32)
            throw new SalesBusinessRuleException("Invalid quantity precision");
        return value.stripTrailingZeros().toPlainString();
    }
    private static String normalize(String value) { return value == null ? "" : value.trim(); }
    private static void add(StringBuilder out, Object value) {
        String text = String.valueOf(value); out.append(text.length()).append(':').append(text).append(';');
    }
}
