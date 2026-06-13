package com.erppos.backend.erp.ecommerce.infrastructure.storage;

import com.erppos.backend.erp.ecommerce.application.service.EcommerceImageStorageProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
@ConditionalOnProperty(prefix = "app.ecommerce.image-storage", name = "provider", havingValue = "s3")
public class S3EcommerceImageStorageConfiguration {
    @Bean
    S3Client ecommerceImageS3Client(EcommerceImageStorageProperties properties) {
        return S3Client.builder()
                .region(Region.of(trimToDefault(properties.getRegion(), "us-east-1")))
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .build();
    }

    private static String trimToDefault(String value, String defaultValue) {
        if (value == null || value.trim().isEmpty()) {
            return defaultValue;
        }
        return value.trim();
    }
}
