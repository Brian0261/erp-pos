package com.erppos.backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BillingEvidenceMetadataMigrationIntegrationTest extends AbstractHttpIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldCreateElectronicDocumentEvidenceTableWithCoreColumns() {
        assertTableExists("electronic_document_evidence");
        assertColumnExists("electronic_document_evidence", "electronic_document_id");
        assertColumnExists("electronic_document_evidence", "attempt_id");
        assertColumnExists("electronic_document_evidence", "evidence_type");
        assertColumnExists("electronic_document_evidence", "storage_provider");
        assertColumnExists("electronic_document_evidence", "checksum_sha256");
        assertColumnExists("electronic_document_evidence", "metadata_status");
    }

    private void assertTableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?",
                Integer.class,
                tableName
        );
        assertEquals(1, count);
    }

    private void assertColumnExists(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ? AND column_name = ?",
                Integer.class,
                tableName,
                columnName
        );
        assertEquals(1, count);
    }
}
