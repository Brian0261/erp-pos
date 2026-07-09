package com.erppos.backend.erp.billing.domain.model;

import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;

import java.time.Instant;
import java.util.Locale;
import java.util.regex.Pattern;

public record ElectronicDocumentEvidence(
        Long id,
        Long electronicDocumentId,
        Long attemptId,
        FiscalEvidenceType evidenceType,
        BillingEnvironment environment,
        boolean simulated,
        FiscalEvidenceStorageProvider storageProvider,
        String storageKey,
        String fileName,
        String mimeType,
        Long sizeBytes,
        String checksumSha256,
        String contentHashSha256,
        String providerTicket,
        String providerCorrelationId,
        String providerStatus,
        FiscalEvidenceMetadataStatus metadataStatus,
        Instant createdAt,
        String createdBy,
        String traceId,
        String notes
) {

    private static final Pattern SHA_256 = Pattern.compile("^[0-9a-f]{64}$");
    private static final Pattern WINDOWS_ABSOLUTE_PATH = Pattern.compile("(?i)^[a-z]:[\\\\/].*");
    private static final Pattern LINUX_ABSOLUTE_PATH = Pattern.compile("^/.*");
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\p{Cntrl}&&[^\\t]]");

    public ElectronicDocumentEvidence {
        if (electronicDocumentId == null) {
            throw new BillingBusinessRuleException("electronicDocumentId is required");
        }
        if (evidenceType == null) {
            throw new BillingBusinessRuleException("evidenceType is required");
        }
        if (environment == null) {
            throw new BillingBusinessRuleException("environment is required");
        }
        if (sizeBytes != null && sizeBytes < 0) {
            throw new BillingBusinessRuleException("sizeBytes must be >= 0");
        }
        storageProvider = storageProvider == null ? FiscalEvidenceStorageProvider.NONE : storageProvider;
        metadataStatus = metadataStatus == null ? FiscalEvidenceMetadataStatus.REGISTERED : metadataStatus;
        storageKey = normalizeOptional(storageKey);
        fileName = normalizeOptional(fileName);
        mimeType = normalizeOptional(mimeType);
        checksumSha256 = normalizeHash(checksumSha256, "checksumSha256");
        contentHashSha256 = normalizeHash(contentHashSha256, "contentHashSha256");
        providerTicket = normalizeOptional(providerTicket);
        providerCorrelationId = normalizeOptional(providerCorrelationId);
        providerStatus = normalizeOptional(providerStatus);
        createdBy = normalizeRequired(createdBy, "createdBy");
        traceId = normalizeOptional(traceId);
        notes = normalizeOptional(notes);

        validateStorageKey(storageKey);
        validateSafeMetadata("storageKey", storageKey);
        validateSafeMetadata("fileName", fileName);
        validateSafeMetadata("mimeType", mimeType);
        validateSafeMetadata("providerTicket", providerTicket);
        validateSafeMetadata("providerCorrelationId", providerCorrelationId);
        validateSafeMetadata("providerStatus", providerStatus);
        validateSafeMetadata("createdBy", createdBy);
        validateSafeMetadata("traceId", traceId);
        validateSafeMetadata("notes", notes);
    }

    private static String normalizeRequired(String value, String field) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw new BillingBusinessRuleException(field + " is required");
        }
        return normalized;
    }

    private static String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = CONTROL_CHARS.matcher(value).replaceAll(" ").trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private static String normalizeHash(String value, String field) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toLowerCase(Locale.ROOT);
        if (!SHA_256.matcher(normalized).matches()) {
            throw new BillingBusinessRuleException(field + " must be a valid SHA-256 hex digest");
        }
        return normalized;
    }

    private static void validateStorageKey(String value) {
        if (value == null) {
            return;
        }
        if (WINDOWS_ABSOLUTE_PATH.matcher(value).matches()
                || LINUX_ABSOLUTE_PATH.matcher(value).matches()
                || value.contains("\\\\")
                || value.contains("..")) {
            throw new BillingBusinessRuleException("storageKey must be a relative opaque key");
        }
    }

    private static void validateSafeMetadata(String field, String value) {
        if (value == null) {
            return;
        }
        String lower = value.toLowerCase(Locale.ROOT);
        if (lower.contains("<xml")
                || lower.contains("<?xml")
                || lower.contains("<cdr")
                || lower.contains("%pdf")
                || lower.contains("data:application/pdf")
                || lower.contains("data:image")
                || lower.contains("base64,")
                || lower.contains("begin certificate")
                || lower.contains("begin private key")
                || lower.contains("bearer ")
                || lower.contains("token=")
                || lower.contains("password=")
                || lower.contains("passwd=")
                || lower.contains("pwd=")
                || lower.contains("authorization:")
                || lower.contains("api-key")
                || lower.contains("api_key")
                || lower.contains("vault://")
                || lower.contains("secret://")
                || lower.contains("file:")) {
            throw new BillingBusinessRuleException(field + " contains unsafe fiscal metadata");
        }
        if (WINDOWS_ABSOLUTE_PATH.matcher(value).matches() || lower.startsWith("/etc/") || lower.startsWith("/home/") || lower.startsWith("/var/")) {
            throw new BillingBusinessRuleException(field + " contains unsafe fiscal metadata");
        }
    }
}
