package com.erppos.backend.erp.billing.infrastructure.xml;

import com.erppos.backend.erp.billing.domain.model.CompanyBillingProfile;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentItem;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import com.erppos.backend.erp.billing.domain.port.UblXmlGeneratorPort;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class UblXmlGeneratorAdapter implements UblXmlGeneratorPort {

    private final UblInvoiceXmlGenerator invoiceXmlGenerator;
    private final UblReceiptXmlGenerator receiptXmlGenerator;

    public UblXmlGeneratorAdapter(UblInvoiceXmlGenerator invoiceXmlGenerator, UblReceiptXmlGenerator receiptXmlGenerator) {
        this.invoiceXmlGenerator = invoiceXmlGenerator;
        this.receiptXmlGenerator = receiptXmlGenerator;
    }

    @Override
    public String generate(ElectronicDocument document, CompanyBillingProfile profile, List<ElectronicDocumentItem> items) {
        if (document.documentType() == ElectronicDocumentType.INVOICE) {
            return invoiceXmlGenerator.generate(document, profile, items);
        }
        return receiptXmlGenerator.generate(document, profile, items);
    }
}

