package com.realhogoo.jsschedule.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import javax.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Object>> handleApi(ApiException exception, HttpServletRequest request) {
        String traceId = TraceId.resolve(request);
        log.warn("[API_ERROR] traceId={}, uri={}, message={}", traceId, request.getRequestURI(), exception.getMessage());
        return ResponseEntity.status(exception.getStatus())
            .body(ApiResponse.fail(exception.getCode().name(), exception.getMessage(), null, traceId));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadRequest(IllegalArgumentException exception, HttpServletRequest request) {
        String traceId = TraceId.resolve(request);
        log.warn("[VALIDATION_ERROR] traceId={}, uri={}, message={}", traceId, request.getRequestURI(), exception.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.fail(ApiCode.VALIDATION_ERROR.name(), exception.getMessage(), null, traceId));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleUnexpected(Exception exception, HttpServletRequest request) {
        String traceId = TraceId.resolve(request);
        log.error("[SERVER_ERROR] traceId={}, uri={}", traceId, request.getRequestURI(), exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.fail(ApiCode.SERVER_ERROR.name(), "unexpected error", null, traceId));
    }
}
