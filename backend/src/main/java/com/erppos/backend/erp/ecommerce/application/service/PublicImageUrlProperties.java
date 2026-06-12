package com.erppos.backend.erp.ecommerce.application.service;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "app.ecommerce.public-images")
public class PublicImageUrlProperties {
    private List<String> allowedDomains = new ArrayList<>();

    public List<String> getAllowedDomains() {
        return allowedDomains;
    }

    public void setAllowedDomains(List<String> allowedDomains) {
        this.allowedDomains = allowedDomains == null ? new ArrayList<>() : new ArrayList<>(allowedDomains);
    }
}
