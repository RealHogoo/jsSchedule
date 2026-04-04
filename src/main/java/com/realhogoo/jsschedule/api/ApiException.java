package com.realhogoo.jsschedule.api;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {

    private final ApiCode code;
    private final HttpStatus status;

    public ApiException(ApiCode code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public ApiCode getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static ApiException badRequest(String message) {
        return new ApiException(ApiCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, message);
    }
}
