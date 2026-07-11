package com.erppos.backend.erp.billing.domain.model;

import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;

import java.util.Locale;
import java.util.regex.Pattern;

final class FiscalEvidenceStorageMetadataGuard {

    private static final Pattern SHA_256 = Pattern.compile("^[0-9a-f]{64}$");
    private static final Pattern WINDOWS_ABSOLUTE_PATH = Pattern.compile("(?i)^[a-z]:[\\\\/].*");
    private static final Pattern LINUX_ABSOLUTE_PATH = Pattern.compile("^/.*");
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\p{Cntrl}&&[^\\t]]");

    private FiscalEvidenceStorageMetadataGuard() {
    }

    static Long requirePositive(Long value, String field) {
        if (value == null || value <= 0) {
            throw new BillingBusinessRuleException(field + " is required");
        }
        return value;
    }

    static Long normalizeNonNegative(Long value, String field) {
        if (value != null && value < 0) {
            throw new BillingBusinessRuleException(field + " must be >= 0");
        }
        return value;
    }

    static String normalizeOptional(String value, String field) {
        if (value == null) {
            return null;
        }
        String normalized = CONTROL_CHARS.matcher(value).replaceAll(" ").trim();
        if (normalized.isEmpty()) {
            return null;
        }
        validateSafeMetadata(field, normalized);
        return normalized;
    }

    static String normalizeStorageKey(String value) {
        String normalized = normalizeOptional(value, "storageKey");
        if (normalized == null) {
            return null;
        }
        if (WINDOWS_ABSOLUTE_PATH.matcher(normalized).matches()
                || LINUX_ABSOLUTE_PATH.matcher(normalized).matches()
                || normalized.contains("\\")
                || normalized.contains("..")) {
            throw new BillingBusinessRuleException("storageKey must be a relative opaque key");
        }
        return normalized;
    }

    static String normalizeHash(String value, String field) {
        String normalized = normalizeOptional(value, field);
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toLowerCase(Locale.ROOT);
        if (!SHA_256.matcher(normalized).matches()) {
            throw new BillingBusinessRuleException(field + " must be a valid SHA-256 hex digest");
        }
        return normalized;
    }

    private static void validateSafeMetadata(String field, String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        if (value.contains("\\")
                || lower.contains("<?xml")
                || lower.contains("<xml")
                || lower.contains("<cdr")
                || lower.contains("%pdf")
                || lower.contains("data:application/pdf")
                || lower.contains("data:image")
                || lower.contains("base64,")
                || lower.contains("begin certificate")
                || lower.contains("begin private key")
                || lower.contains("authorization:")
                || lower.contains("bearer ")
                || lower.contains("basic ")
                || lower.contains("cookie:")
                || lower.contains("set-cookie:")
                || lower.contains("token=")
                || lower.contains("password=")
                || lower.contains("passwd=")
                || lower.contains("pwd=")
                || lower.contains("api-key")
                || lower.contains("api_key")
                || lower.contains("vault://")
                || lower.contains("secret://")
                || lower.contains("file:")
                || lower.contains("arn:aws")
                || lower.contains("storage.googleapis")
                || lower.contains("blob.core.windows")) {
            throw new BillingBusinessRuleException(field + " contains unsafe fiscal metadata");
        }
        if (WINDOWS_ABSOLUTE_PATH.matcher(value).matches()
                || lower.startsWith("/etc/")
                || lower.startsWith("/home/")
                || lower.startsWith("/var/")) {
            throw new BillingBusinessRuleException(field + " contains unsafe fiscal metadata");
        }
    }
}
