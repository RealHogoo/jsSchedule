package com.realhogoo.jsschedule.api;

public enum ApiCode {
    OK("S0000", "success"),
    VALIDATION_ERROR("S4000", "오류 코드 [S4000] 관리자에게 문의하세요."),
    AUTH_REQUIRED("S4001", "오류 코드 [S4001] 관리자에게 문의하세요."),
    FORBIDDEN("S4003", "오류 코드 [S4003] 관리자에게 문의하세요."),
    NOT_FOUND("S4004", "오류 코드 [S4004] 관리자에게 문의하세요."),
    BIZ_ERROR("S4090", "오류 코드 [S4090] 관리자에게 문의하세요."),
    SERVER_ERROR("S5000", "알 수 없는 오류가 발생했습니다. 관리자에게 문의하세요."),
    UNAUTHORIZED("S4002", "오류 코드 [S4002] 관리자에게 문의하세요."),
    METHOD_NOT_ALLOWED("S4005", "오류 코드 [S4005] 관리자에게 문의하세요.");

    private final String errorNo;
    private final String defaultMessage;

    ApiCode(String errorNo, String defaultMessage) {
        this.errorNo = errorNo;
        this.defaultMessage = defaultMessage;
    }

    public String errorNo() {
        return errorNo;
    }

    public String defaultMessage() {
        return defaultMessage;
    }
}
