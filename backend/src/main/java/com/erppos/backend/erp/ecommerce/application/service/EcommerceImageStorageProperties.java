package com.erppos.backend.erp.ecommerce.application.service;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.ecommerce.image-storage")
public class EcommerceImageStorageProperties {
    private String provider = "none";
    private String region = "us-east-1";
    private String bucket;
    private String prefix;
    private String publicBaseUrl;
    private String cacheControl = "public, max-age=31536000, immutable";
    private long maxSizeBytes = 5L * 1024L * 1024L;
    private int maxWidth = 6000;
    private int maxHeight = 6000;

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public String getBucket() { return bucket; }
    public void setBucket(String bucket) { this.bucket = bucket; }
    public String getPrefix() { return prefix; }
    public void setPrefix(String prefix) { this.prefix = prefix; }
    public String getPublicBaseUrl() { return publicBaseUrl; }
    public void setPublicBaseUrl(String publicBaseUrl) { this.publicBaseUrl = publicBaseUrl; }
    public String getCacheControl() { return cacheControl; }
    public void setCacheControl(String cacheControl) { this.cacheControl = cacheControl; }
    public long getMaxSizeBytes() { return maxSizeBytes; }
    public void setMaxSizeBytes(long maxSizeBytes) { this.maxSizeBytes = maxSizeBytes; }
    public int getMaxWidth() { return maxWidth; }
    public void setMaxWidth(int maxWidth) { this.maxWidth = maxWidth; }
    public int getMaxHeight() { return maxHeight; }
    public void setMaxHeight(int maxHeight) { this.maxHeight = maxHeight; }
}
