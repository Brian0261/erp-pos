package com.erppos.backend.erp.shared;

import com.erppos.backend.erp.quotes.domain.exception.QuoteBusinessRuleException;
import com.erppos.backend.erp.quotes.domain.exception.QuoteConflictException;
import com.erppos.backend.erp.quotes.domain.exception.QuoteNotFoundException;
import com.erppos.backend.erp.sales.domain.exception.SalesConflictException;
import com.erppos.backend.erp.shared.adapter.rest.ApiError;
import com.erppos.backend.erp.shared.adapter.rest.ErrorResponseFactory;
import com.erppos.backend.erp.shared.adapter.rest.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler(new ErrorResponseFactory());
        request = new MockHttpServletRequest("POST", "/api/v1/quotes/1/convert-to-sale");
        request.setAttribute(ErrorResponseFactory.TRACE_ID_ATTRIBUTE, "test-trace-id");
    }

    @Test
    void shouldMapQuoteConflictExceptionTo409() {
        ResponseEntity<ApiError> response = exceptionHandler.handleConflict(new QuoteConflictException("Quote already converted"), request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(409, response.getBody().status());
        assertEquals("Quote already converted", response.getBody().message());
    }

    @Test
    void shouldMapQuoteBusinessRuleExceptionTo422() {
        ResponseEntity<ApiError> response = exceptionHandler.handleBusinessRule(new QuoteBusinessRuleException("Quote is expired and cannot be converted"), request);

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(422, response.getBody().status());
        assertEquals("Quote is expired and cannot be converted", response.getBody().message());
    }

    @Test
    void shouldMapQuoteNotFoundExceptionTo404() {
        ResponseEntity<ApiError> response = exceptionHandler.handleNotFound(new QuoteNotFoundException("Quote not found"), request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(404, response.getBody().status());
        assertEquals("Quote not found", response.getBody().message());
    }

    @Test
    void shouldMapSalesConflictExceptionTo409() {
        ResponseEntity<ApiError> response = exceptionHandler.handleConflict(new SalesConflictException("El usuario ya tiene una caja abierta."), request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(409, response.getBody().status());
        assertEquals("El usuario ya tiene una caja abierta.", response.getBody().message());
    }
}

