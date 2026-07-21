package com.erppos.backend.erp.shared;

import com.erppos.backend.erp.billing.domain.exception.BillingPreconditionFailedException;
import com.erppos.backend.erp.billing.domain.exception.BillingPreconditionFormatException;
import com.erppos.backend.erp.billing.domain.exception.BillingPreconditionRequiredException;
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
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.http.HttpHeaders.CACHE_CONTROL;

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

    @Test
    void shouldMapMalformedBillingPreconditionTo400() {
        ResponseEntity<ApiError> response = exceptionHandler.handlePreconditionFormat(
                new BillingPreconditionFormatException("If-Match invalido"),
                request
        );

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().status());
        assertEquals("If-Match invalido", response.getBody().message());
    }

    @Test
    void shouldMapMissingBillingPreconditionTo428WithoutCaching() {
        String message = "El header If-Match es obligatorio para modificar una serie. Recarga la serie y vuelve a intentarlo con su versión vigente.";

        ResponseEntity<ApiError> response = exceptionHandler.handlePreconditionRequired(
                new BillingPreconditionRequiredException(message),
                request
        );

        assertEquals(HttpStatus.PRECONDITION_REQUIRED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(428, response.getBody().status());
        assertEquals(message, response.getBody().message());
        assertEquals("no-store", response.getHeaders().getFirst(CACHE_CONTROL));
    }

    @Test
    void shouldMapExplicitAndResidualOptimisticConflictsTo412WithoutOrmDetails() {
        ResponseEntity<ApiError> explicit = exceptionHandler.handlePreconditionFailed(
                new BillingPreconditionFailedException("La serie cambio"),
                request
        );
        ResponseEntity<ApiError> residual = exceptionHandler.handlePreconditionFailed(
                new ObjectOptimisticLockingFailureException("BillingSeriesEntity", 41L),
                request
        );

        assertEquals(HttpStatus.PRECONDITION_FAILED, explicit.getStatusCode());
        assertEquals("La serie cambio", explicit.getBody().message());
        assertEquals(HttpStatus.PRECONDITION_FAILED, residual.getStatusCode());
        assertEquals(412, residual.getBody().status());
        assertEquals(
                "La serie fue modificada concurrentemente. Recarga su estado antes de intentar nuevamente.",
                residual.getBody().message()
        );
    }
}

