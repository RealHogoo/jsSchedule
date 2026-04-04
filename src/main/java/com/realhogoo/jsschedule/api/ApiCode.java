package com.realhogoo.jsschedule.api;

public enum ApiCode {
    OK("success"),
    VALIDATION_ERROR("invalid request"),
    AUTH_REQUIRED("authentication required"),
    FORBIDDEN("forbidden"),
    NOT_FOUND("not found"),
    BIZ_ERROR("business rule violated"),
    SERVER_ERROR("unexpected server error"),
    UNAUTHORIZED("login required"),
    METHOD_NOT_ALLOWED("method not allowed");

    private final String defaultMessage;

    ApiCode(String defaultMessage) {
        this.defaultMessage = defaultMessage;
    }

    public String defaultMessage() {
        return defaultMessage;
    }
}
