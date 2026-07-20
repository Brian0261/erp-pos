package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;

record FiscalSendPreparation(
        ElectronicDocument document,
        Long attemptId,
        String requestHash,
        String signedXml
) {
}
