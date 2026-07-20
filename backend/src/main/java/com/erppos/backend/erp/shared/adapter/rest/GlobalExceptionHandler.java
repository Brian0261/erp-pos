package com.erppos.backend.erp.shared.adapter.rest;

import com.erppos.backend.erp.admin.cleanup.domain.exception.CleanupBusinessRuleException;
import com.erppos.backend.erp.catalog.domain.exception.CatalogBusinessRuleException;
import com.erppos.backend.erp.catalog.domain.exception.CatalogConflictException;
import com.erppos.backend.erp.catalog.domain.exception.CatalogNotFoundException;
import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;
import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.exception.BillingNotFoundException;
import com.erppos.backend.erp.billing.domain.exception.BillingPreconditionFailedException;
import com.erppos.backend.erp.billing.domain.exception.BillingPreconditionFormatException;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicErrorResponse;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceBusinessRuleException;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceConflictException;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceNotFoundException;
import com.erppos.backend.erp.inventory.domain.exception.InventoryBusinessRuleException;
import com.erppos.backend.erp.inventory.domain.exception.InventoryConflictException;
import com.erppos.backend.erp.inventory.domain.exception.InventoryNotFoundException;
import com.erppos.backend.erp.integrations.domain.exception.IntegrationBusinessRuleException;
import com.erppos.backend.erp.integrations.domain.exception.IntegrationNotFoundException;
import com.erppos.backend.erp.purchases.domain.exception.PurchaseBusinessRuleException;
import com.erppos.backend.erp.purchases.domain.exception.PurchaseConflictException;
import com.erppos.backend.erp.purchases.domain.exception.PurchaseNotFoundException;
import com.erppos.backend.erp.quotes.domain.exception.QuoteBusinessRuleException;
import com.erppos.backend.erp.quotes.domain.exception.QuoteConflictException;
import com.erppos.backend.erp.quotes.domain.exception.QuoteNotFoundException;
import com.erppos.backend.erp.sales.domain.exception.SalesBusinessRuleException;
import com.erppos.backend.erp.sales.domain.exception.SalesConflictException;
import com.erppos.backend.erp.sales.domain.exception.SalesNotFoundException;
import com.erppos.backend.erp.reports.domain.exception.ReportBusinessRuleException;
import com.erppos.backend.erp.reports.domain.exception.ReportNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final ErrorResponseFactory errorResponseFactory;

    public GlobalExceptionHandler(ErrorResponseFactory errorResponseFactory) {
        this.errorResponseFactory = errorResponseFactory;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(this::formatFieldError)
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(errorResponseFactory.build(request, HttpStatus.BAD_REQUEST, message));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        return ResponseEntity.badRequest().body(errorResponseFactory.build(request, HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> handleResponseStatus(ResponseStatusException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        if (isStorefrontRequest(request)) {
            return ResponseEntity.status(status)
                    .body(new PublicErrorResponse(
                            Instant.now(),
                            status.value(),
                            publicErrorCode(status),
                            ex.getReason() == null ? defaultPublicMessage(status) : ex.getReason(),
                            request.getRequestURI(),
                            traceId(request)
                    ));
        }
        return ResponseEntity.status(status)
                .body(errorResponseFactory.build(request, status, ex.getReason() == null ? status.getReasonPhrase() : ex.getReason()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> handleBadCredentials(BadCredentialsException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(errorResponseFactory.build(request, HttpStatus.UNAUTHORIZED, "Invalid credentials"));
    }

    @ExceptionHandler({CatalogNotFoundException.class, InventoryNotFoundException.class, PurchaseNotFoundException.class, SalesNotFoundException.class, QuoteNotFoundException.class, BillingNotFoundException.class, ReportNotFoundException.class, IntegrationNotFoundException.class, EcommerceNotFoundException.class})
    public ResponseEntity<ApiError> handleNotFound(RuntimeException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponseFactory.build(request, HttpStatus.NOT_FOUND, ex.getMessage()));
    }

    @ExceptionHandler(BillingPreconditionFormatException.class)
    public ResponseEntity<ApiError> handlePreconditionFormat(
            BillingPreconditionFormatException ex,
            HttpServletRequest request
    ) {
        return ResponseEntity.badRequest()
                .body(errorResponseFactory.build(request, HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    @ExceptionHandler({BillingPreconditionFailedException.class, OptimisticLockingFailureException.class})
    public ResponseEntity<ApiError> handlePreconditionFailed(Exception ex, HttpServletRequest request) {
        String message = ex instanceof BillingPreconditionFailedException
                ? ex.getMessage()
                : "La serie fue modificada concurrentemente. Recarga su estado antes de intentar nuevamente.";
        return ResponseEntity.status(HttpStatus.PRECONDITION_FAILED)
                .body(errorResponseFactory.build(request, HttpStatus.PRECONDITION_FAILED, message));
    }

    @ExceptionHandler({CatalogConflictException.class, InventoryConflictException.class, PurchaseConflictException.class, SalesConflictException.class, QuoteConflictException.class, BillingConflictException.class, EcommerceConflictException.class, DataIntegrityViolationException.class})
    public ResponseEntity<ApiError> handleConflict(Exception ex, HttpServletRequest request) {
        String message = (ex instanceof CatalogConflictException
                || ex instanceof InventoryConflictException
                || ex instanceof PurchaseConflictException
                || ex instanceof SalesConflictException
                || ex instanceof QuoteConflictException
                || ex instanceof BillingConflictException
                || ex instanceof EcommerceConflictException)
                ? ex.getMessage()
                : "Conflict: duplicated value";
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(errorResponseFactory.build(request, HttpStatus.CONFLICT, message));
    }

    @ExceptionHandler({CleanupBusinessRuleException.class, CatalogBusinessRuleException.class, InventoryBusinessRuleException.class, PurchaseBusinessRuleException.class, SalesBusinessRuleException.class, QuoteBusinessRuleException.class, BillingBusinessRuleException.class, ReportBusinessRuleException.class, IntegrationBusinessRuleException.class, EcommerceBusinessRuleException.class})
    public ResponseEntity<ApiError> handleBusinessRule(RuntimeException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(errorResponseFactory.build(request, HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage()));
    }

    @ExceptionHandler(AuthorizationDeniedException.class)
    public ResponseEntity<ApiError> handleAuthorizationDenied(AuthorizationDeniedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(errorResponseFactory.build(request, HttpStatus.FORBIDDEN, "Access denied"));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<?> handleNoResourceFound(NoResourceFoundException ex, HttpServletRequest request) {
        if (isStorefrontRequest(request)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new PublicErrorResponse(
                            Instant.now(),
                            HttpStatus.NOT_FOUND.value(),
                            "PUBLIC_RESOURCE_NOT_FOUND",
                            "Public resource not found",
                            request.getRequestURI(),
                            traceId(request)
                    ));
        }
        return handleGeneric(ex, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneric(Exception ex, HttpServletRequest request) {
        LOGGER.error("Unhandled exception while processing {} {}", request.getMethod(), request.getRequestURI(), ex);
        if (isStorefrontRequest(request)) {
            if (isStorefrontInvalidRequestException(ex)) {
                return ResponseEntity.badRequest()
                        .body(new PublicErrorResponse(
                                Instant.now(),
                                HttpStatus.BAD_REQUEST.value(),
                                "PUBLIC_INVALID_REQUEST",
                                "Invalid public request",
                                request.getRequestURI(),
                                traceId(request)
                        ));
            }
            return ResponseEntity.internalServerError()
                    .body(new PublicErrorResponse(
                            Instant.now(),
                            HttpStatus.INTERNAL_SERVER_ERROR.value(),
                            "PUBLIC_INTERNAL_ERROR",
                            "Unexpected public error",
                            request.getRequestURI(),
                            traceId(request)
                    ));
        }
        return ResponseEntity.internalServerError()
                .body(errorResponseFactory.build(request, HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error"));
    }

    private String formatFieldError(FieldError fieldError) {
        return fieldError.getField() + " " + fieldError.getDefaultMessage();
    }

    private boolean isStorefrontRequest(HttpServletRequest request) {
        return request.getRequestURI().startsWith("/api/v1/storefront/");
    }

    private String traceId(HttpServletRequest request) {
        String traceId = (String) request.getAttribute(ErrorResponseFactory.TRACE_ID_ATTRIBUTE);
        return traceId == null ? "N/A" : traceId;
    }

    private String publicErrorCode(HttpStatus status) {
        if (status == HttpStatus.BAD_REQUEST) {
            return "PUBLIC_INVALID_REQUEST";
        }
        if (status == HttpStatus.NOT_FOUND) {
            return "PUBLIC_RESOURCE_NOT_FOUND";
        }
        if (status == HttpStatus.UNPROCESSABLE_ENTITY) {
            return "PUBLIC_UNPROCESSABLE_REQUEST";
        }
        return "PUBLIC_INTERNAL_ERROR";
    }

    private String defaultPublicMessage(HttpStatus status) {
        if (status == HttpStatus.BAD_REQUEST) {
            return "Invalid public request";
        }
        if (status == HttpStatus.NOT_FOUND) {
            return "Public resource not found";
        }
        if (status == HttpStatus.UNPROCESSABLE_ENTITY) {
            return "Public request cannot be processed";
        }
        return "Unexpected public error";
    }

    private boolean isStorefrontInvalidRequestException(Exception ex) {
        return ex instanceof MethodArgumentTypeMismatchException
                || ex instanceof MissingServletRequestParameterException
                || ex instanceof BindException
                || ex instanceof HandlerMethodValidationException;
    }
}
