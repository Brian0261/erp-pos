package com.erppos.backend.erp.shared;

import com.erppos.backend.erp.shared.adapter.dto.PageResponse;
import com.erppos.backend.erp.shared.adapter.dto.PageResponseMapper;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PageResponseMapperTest {

    @Test
    void shouldMapSpringPageToStablePageResponse() {
        Page<String> page = new PageImpl<>(
                List.of("A", "B"),
                PageRequest.of(2, 2),
                11
        );

        PageResponse<String> response = PageResponseMapper.from(page);

        assertEquals(List.of("A", "B"), response.items());
        assertEquals(2, response.page());
        assertEquals(2, response.size());
        assertEquals(11, response.totalItems());
        assertEquals(6, response.totalPages());
    }
}

