package com.realhogoo.jsschedule.api;

public final class ApiErrorSupport {

    private ApiErrorSupport() {
    }

    public static String code(ApiCode apiCode) {
        return apiCode.errorNo();
    }

    public static String message(ApiCode apiCode) {
        return apiCode.defaultMessage();
    }
}
