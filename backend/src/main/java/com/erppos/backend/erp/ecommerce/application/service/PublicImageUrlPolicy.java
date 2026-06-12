package com.erppos.backend.erp.ecommerce.application.service;

import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class PublicImageUrlPolicy {
    public static final int MAX_URL_LENGTH = 500;
    public static final String GENERIC_INVALID_MESSAGE = "La URL de imagen no es publica o usa un dominio no permitido.";
    public static final String BLOCKED_TEST_DOMAIN_MESSAGE = "No se permiten dominios localhost, test o example.";

    private static final Set<String> BLOCKED_HOSTS = Set.of("localhost", "127.0.0.1", "0.0.0.0");
    private static final List<String> BLOCKED_SUFFIXES = List.of(".test", ".example", ".example.com", ".example.test");

    private final PublicImageUrlProperties properties;

    public PublicImageUrlPolicy(PublicImageUrlProperties properties) {
        this.properties = properties;
    }

    public ValidationResult validate(String rawUrl) {
        String url = trimToNull(rawUrl);
        if (url == null) {
            return ValidationResult.invalid("Asset URL is required");
        }
        if (url.length() > MAX_URL_LENGTH) {
            return ValidationResult.invalid("Asset URL max length is " + MAX_URL_LENGTH);
        }
        if (containsUnsafeCharacters(url)) {
            return ValidationResult.invalid(GENERIC_INVALID_MESSAGE);
        }

        if (isPublicRelativePath(url)) {
            return ValidationResult.ok();
        }
        if (looksRelativeButUnsafe(url)) {
            return ValidationResult.invalid(GENERIC_INVALID_MESSAGE);
        }

        URI uri;
        try {
            uri = new URI(url);
        } catch (URISyntaxException ex) {
            return ValidationResult.invalid(GENERIC_INVALID_MESSAGE);
        }

        String scheme = uri.getScheme();
        if (scheme == null || !"https".equalsIgnoreCase(scheme)) {
            return ValidationResult.invalid(GENERIC_INVALID_MESSAGE);
        }
        if (uri.getUserInfo() != null) {
            return ValidationResult.invalid(GENERIC_INVALID_MESSAGE);
        }
        if (trimToNull(uri.getRawPath()) == null || !uri.getRawPath().startsWith("/")) {
            return ValidationResult.invalid(GENERIC_INVALID_MESSAGE);
        }

        String host = normalizeHost(uri.getHost());
        if (host == null) {
            return ValidationResult.invalid(GENERIC_INVALID_MESSAGE);
        }
        if (isBlockedHost(host)) {
            return ValidationResult.invalid(BLOCKED_TEST_DOMAIN_MESSAGE);
        }
        if (isPrivateIpAddress(host)) {
            return ValidationResult.invalid(GENERIC_INVALID_MESSAGE);
        }
        if (!isAllowedDomain(host)) {
            return ValidationResult.invalid(GENERIC_INVALID_MESSAGE);
        }

        return ValidationResult.ok();
    }

    private boolean isAllowedDomain(String host) {
        List<String> allowedDomains = properties.getAllowedDomains().stream()
                .map(PublicImageUrlPolicy::normalizeConfiguredDomain)
                .filter(domain -> domain != null && !domain.isBlank())
                .toList();
        if (allowedDomains.isEmpty()) {
            return false;
        }
        return allowedDomains.stream().anyMatch(domain -> host.equals(domain) || host.endsWith("." + domain));
    }

    private boolean isBlockedHost(String host) {
        return BLOCKED_HOSTS.contains(host)
                || BLOCKED_SUFFIXES.stream().anyMatch(host::endsWith);
    }

    private boolean isPublicRelativePath(String url) {
        return url.startsWith("/") && !url.startsWith("//") && !url.contains("\\");
    }

    private boolean looksRelativeButUnsafe(String url) {
        return url.startsWith("/") || url.contains("\\");
    }

    private static String normalizeConfiguredDomain(String rawDomain) {
        String domain = trimToNull(rawDomain);
        if (domain == null) {
            return null;
        }
        String withoutScheme = domain
                .replaceFirst("(?i)^https://", "")
                .replaceFirst("(?i)^http://", "");
        int slashIndex = withoutScheme.indexOf('/');
        if (slashIndex >= 0) {
            withoutScheme = withoutScheme.substring(0, slashIndex);
        }
        int portIndex = withoutScheme.indexOf(':');
        if (portIndex >= 0) {
            withoutScheme = withoutScheme.substring(0, portIndex);
        }
        return normalizeHost(withoutScheme);
    }

    private static String normalizeHost(String host) {
        String normalized = trimToNull(host);
        return normalized == null ? null : normalized.toLowerCase(Locale.ROOT);
    }

    private static boolean containsUnsafeCharacters(String value) {
        return value.chars().anyMatch(ch -> Character.isISOControl(ch) || Character.isWhitespace(ch));
    }

    private static boolean isPrivateIpAddress(String host) {
        if (isIpv4(host)) {
            String[] parts = host.split("\\.");
            int first = Integer.parseInt(parts[0]);
            int second = Integer.parseInt(parts[1]);
            return first == 10
                    || first == 127
                    || (first == 172 && second >= 16 && second <= 31)
                    || (first == 192 && second == 168)
                    || (first == 169 && second == 254)
                    || first == 0;
        }
        return host.equals("::1")
                || host.equals("0:0:0:0:0:0:0:1")
                || host.startsWith("fc")
                || host.startsWith("fd")
                || host.startsWith("fe80:");
    }

    private static boolean isIpv4(String host) {
        if (!host.matches("\\d{1,3}(\\.\\d{1,3}){3}")) {
            return false;
        }
        String[] parts = host.split("\\.");
        for (String part : parts) {
            int value = Integer.parseInt(part);
            if (value > 255) {
                return false;
            }
        }
        return true;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record ValidationResult(boolean valid, String message) {
        static ValidationResult ok() {
            return new ValidationResult(true, null);
        }

        static ValidationResult invalid(String message) {
            return new ValidationResult(false, message);
        }
    }
}
