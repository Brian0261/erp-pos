package com.erppos.backend.erp.shared.adapter.rest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

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
    public ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        return ResponseEntity.status(status)
                .body(errorResponseFactory.build(request, status, ex.getReason() == null ? status.getReasonPhrase() : ex.getReason()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> handleBadCredentials(BadCredentialsException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(errorResponseFactory.build(request, HttpStatus.UNAUTHORIZED, "Invalid credentials"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex, HttpServletRequest request) {
        LOGGER.error("Unhandled exception while processing {} {}", request.getMethod(), request.getRequestURI(), ex);
        return ResponseEntity.internalServerError()
                .body(errorResponseFactory.build(request, HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error"));
    }

    private String formatFieldError(FieldError fieldError) {
        return fieldError.getField() + " " + fieldError.getDefaultMessage();
    }
}

