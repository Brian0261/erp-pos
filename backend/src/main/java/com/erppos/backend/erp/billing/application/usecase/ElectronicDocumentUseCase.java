package com.erppos.backend.erp.billing.application.usecase;

import com.erppos.backend.erp.billing.domain.model.BillingXmlFile;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentEvidence;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentItem;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatusHistory;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;

import java.time.LocalDate;
import java.util.List;

public interface ElectronicDocumentUseCase {
    ElectronicDocument createFromSale(Long saleId, CreateElectronicDocumentFromSaleCommand command);
    List<ElectronicDocument> list(ElectronicDocumentStatus status, ElectronicDocumentType type, Long saleId, LocalDate from, LocalDate to);
    ElectronicDocument getById(Long id);
    ElectronicDocument generateXml(Long id);
    ElectronicDocument sign(Long id);
    ElectronicDocument send(Long id);
    ElectronicDocument retrySend(Long id);
    List<ElectronicDocumentItem> items(Long id);
    BillingXmlFile getXml(Long id);
    List<ElectronicDocumentEvidence> evidence(Long id);
    List<ElectronicDocumentStatusHistory> history(Long id);
}


