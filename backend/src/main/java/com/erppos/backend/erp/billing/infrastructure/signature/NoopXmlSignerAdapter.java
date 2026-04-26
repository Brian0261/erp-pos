package com.erppos.backend.erp.billing.infrastructure.signature;

import org.springframework.stereotype.Component;

@Component
public class NoopXmlSignerAdapter {

    public String sign(String xml) {
        return xml + "\n<!-- SIGNATURE:NOOP -->";
    }
}

