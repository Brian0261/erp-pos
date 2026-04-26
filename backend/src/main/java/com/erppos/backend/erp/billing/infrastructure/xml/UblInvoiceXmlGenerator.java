package com.erppos.backend.erp.billing.infrastructure.xml;

import com.erppos.backend.erp.billing.domain.model.CompanyBillingProfile;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentItem;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class UblInvoiceXmlGenerator {

    public String generate(ElectronicDocument document, CompanyBillingProfile profile, List<ElectronicDocumentItem> items) {
        return buildXml("INVOICE", document, profile, items);
    }

    private String buildXml(String root, ElectronicDocument document, CompanyBillingProfile profile, List<ElectronicDocumentItem> items) {
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.append("<").append(root).append(">");
        sb.append("<DocumentNumber>").append(document.fullNumber()).append("</DocumentNumber>");
        sb.append("<Ruc>").append(profile.ruc()).append("</Ruc>");
        sb.append("<LegalName>").append(escape(profile.legalName())).append("</LegalName>");
        sb.append("<CustomerName>").append(escape(document.customerName())).append("</CustomerName>");
        if (document.customerDocument() != null) {
            sb.append("<CustomerDocument>").append(escape(document.customerDocument())).append("</CustomerDocument>");
        }
        sb.append("<Subtotal>").append(document.subtotalAmount()).append("</Subtotal>");
        sb.append("<Tax>").append(document.taxAmount()).append("</Tax>");
        sb.append("<Total>").append(document.totalAmount()).append("</Total>");
        sb.append("<Items>");
        for (ElectronicDocumentItem item : items) {
            sb.append("<Item>");
            sb.append("<ProductId>").append(item.productId()).append("</ProductId>");
            sb.append("<Description>").append(escape(item.description())).append("</Description>");
            sb.append("<Quantity>").append(item.quantity()).append("</Quantity>");
            sb.append("<UnitPrice>").append(item.unitPrice()).append("</UnitPrice>");
            sb.append("<Discount>").append(item.discountAmount()).append("</Discount>");
            sb.append("<LineTotal>").append(item.lineTotal()).append("</LineTotal>");
            sb.append("</Item>");
        }
        sb.append("</Items>");
        sb.append("</").append(root).append(">");
        return sb.toString();
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}

