package com.erppos.backend.erp.billing.application.service;

import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

@Service
public class FiscalAuditSanitizer {

    private static final int PROVIDER_MESSAGE_MAX_LENGTH = 400;
    private static final int PROVIDER_CODE_MAX_LENGTH = 80;
    private static final int PROVIDER_TICKET_MAX_LENGTH = 120;
    private static final int PROVIDER_CORRELATION_ID_MAX_LENGTH = 120;
    private static final int TRACE_ID_MAX_LENGTH = 80;

    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\p{Cntrl}&&[^\\t]]");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");
    private static final Pattern BEARER_TOKEN = Pattern.compile("(?i)\\bbearer\\s+\\S+");
    private static final Pattern SENSITIVE_KEY_VALUE = Pattern.compile("(?i)\\b(password|passwd|pwd|token|secret|authorization|api[-_ ]?key|certificate|private[-_ ]?key)\\b\\s*[:=]\\s*\\S+");
    private static final Pattern SECRET_REF = Pattern.compile("(?i)\\b(vault|secret|secrets|aws-secretsmanager|gcp-secret-manager|azure-keyvault)://\\S+");
    private static final Pattern FILE_URI = Pattern.compile("(?i)\\bfile:\\S+");
    private static final Pattern WINDOWS_PATH = Pattern.compile("(?i)\\b[a-z]:\\\\\\S+");
    private static final Pattern CERT_FILE = Pattern.compile("(?i)\\S+\\.(pfx|p12|pem|crt|cer|jks|keystore)\\b");
    private static final Pattern XML_BLOCK = Pattern.compile("(?is)<[^>]+>.*?</[^>]+>");
    private static final Pattern XML_TAG = Pattern.compile("(?is)<[^>]+>");

    public String providerMessage(String value) {
        return sanitize(value, PROVIDER_MESSAGE_MAX_LENGTH);
    }

    public String providerCode(String value) {
        return sanitize(value, PROVIDER_CODE_MAX_LENGTH);
    }

    public String providerTicket(String value) {
        return sanitize(value, PROVIDER_TICKET_MAX_LENGTH);
    }

    public String providerCorrelationId(String value) {
        return sanitize(value, PROVIDER_CORRELATION_ID_MAX_LENGTH);
    }

    public String traceId(String value) {
        return sanitize(value, TRACE_ID_MAX_LENGTH);
    }

    private String sanitize(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String sanitized = CONTROL_CHARS.matcher(value).replaceAll(" ");
        sanitized = XML_BLOCK.matcher(sanitized).replaceAll("[REDACTED_XML]");
        sanitized = XML_TAG.matcher(sanitized).replaceAll("[REDACTED_XML]");
        sanitized = BEARER_TOKEN.matcher(sanitized).replaceAll("[REDACTED]");
        sanitized = SENSITIVE_KEY_VALUE.matcher(sanitized).replaceAll("[REDACTED]");
        sanitized = SECRET_REF.matcher(sanitized).replaceAll("[REDACTED]");
        sanitized = FILE_URI.matcher(sanitized).replaceAll("[REDACTED]");
        sanitized = WINDOWS_PATH.matcher(sanitized).replaceAll("[REDACTED]");
        sanitized = CERT_FILE.matcher(sanitized).replaceAll("[REDACTED]");
        sanitized = WHITESPACE.matcher(sanitized).replaceAll(" ").trim();
        if (sanitized.isEmpty()) {
            return null;
        }
        return sanitized.length() <= maxLength ? sanitized : sanitized.substring(0, maxLength);
    }
}
