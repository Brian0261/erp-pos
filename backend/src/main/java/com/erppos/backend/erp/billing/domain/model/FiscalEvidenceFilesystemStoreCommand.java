package com.erppos.backend.erp.billing.domain.model;

import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

public record FiscalEvidenceFilesystemStoreCommand(
        FiscalEvidenceStoreCommand metadataCommand,
        byte[] content,
        Long contentLength,
        String expectedSha256
) {
    public FiscalEvidenceFilesystemStoreCommand {
        if (metadataCommand == null) {
            throw new BillingBusinessRuleException("metadataCommand is required");
        }
        if (content == null || content.length == 0) {
            throw new BillingBusinessRuleException("synthetic content is required");
        }
        content = content.clone();
        contentLength = FiscalEvidenceStorageMetadataGuard.normalizeNonNegative(contentLength, "contentLength");
        if (contentLength == null) {
            throw new BillingBusinessRuleException("contentLength is required");
        }
        expectedSha256 = FiscalEvidenceStorageMetadataGuard.normalizeHash(expectedSha256, "expectedSha256");
        if (expectedSha256 == null) {
            throw new BillingBusinessRuleException("expectedSha256 is required");
        }
        validateSyntheticContent(content);
    }

    @Override
    public byte[] content() {
        return content.clone();
    }

    public FiscalEvidenceStorageMetadata metadata() {
        return metadataCommand.metadata();
    }

    private static void validateSyntheticContent(byte[] content) {
        String lower = new String(content, StandardCharsets.ISO_8859_1).toLowerCase(Locale.ROOT);
        if (lower.contains("<?xml")
                || lower.contains("<xml")
                || lower.contains("<cdr")
                || lower.contains("%pdf")
                || lower.contains("data:application/pdf")
                || lower.contains("data:image")
                || lower.contains("base64,")
                || lower.contains("begin certificate")
                || lower.contains("begin private key")) {
            throw new BillingBusinessRuleException("filesystem evidence payload must be synthetic and non fiscal");
        }
    }
}
