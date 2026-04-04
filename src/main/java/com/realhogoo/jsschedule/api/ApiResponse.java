package com.realhogoo.jsschedule.api;

import javax.servlet.http.HttpServletRequest;

public class ApiResponse<T> {

    private boolean ok;
    private String code;
    private String message;
    private T data;
    private ApiMeta meta;

    public static <T> ApiResponse<T> ok(T data, String traceId) {
        ApiResponse<T> response = new ApiResponse<T>();
        response.ok = true;
        response.code = ApiCode.OK.name();
        response.message = "success";
        response.data = data;
        response.meta = ApiMeta.now(traceId);
        return response;
    }

    public static <T> ApiResponse<T> ok(T data, HttpServletRequest request) {
        return ok(data, TraceId.resolve(request));
    }

    public static <T> ApiResponse<T> fail(ApiCode code, String message, HttpServletRequest request) {
        return fail(code.name(), message == null ? code.defaultMessage() : message, null, TraceId.resolve(request));
    }

    public static <T> ApiResponse<T> fail(String code, String message, T data, String traceId) {
        ApiResponse<T> response = new ApiResponse<T>();
        response.ok = false;
        response.code = code;
        response.message = message;
        response.data = data;
        response.meta = ApiMeta.now(traceId);
        return response;
    }

    public boolean isOk() {
        return ok;
    }

    public String getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public T getData() {
        return data;
    }

    public ApiMeta getMeta() {
        return meta;
    }
}
