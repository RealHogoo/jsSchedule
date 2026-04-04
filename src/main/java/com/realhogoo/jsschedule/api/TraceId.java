package com.realhogoo.jsschedule.api;

import javax.servlet.http.HttpServletRequest;
import java.util.UUID;

public class TraceId {
    public static String newId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    public static String resolve(HttpServletRequest request) {
        if (request == null) {
            return newId();
        }
        Object value = request.getAttribute("trace_id");
        if (value == null) {
            value = request.getHeader("X-Trace-Id");
        }
        if (value == null) {
            value = request.getHeader("X-Request-Id");
        }
        return value != null ? String.valueOf(value) : newId();
    }
}
