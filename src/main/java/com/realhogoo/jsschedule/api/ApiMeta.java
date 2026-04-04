package com.realhogoo.jsschedule.api;

public class ApiMeta {
    private long ts;
    private String traceId;

    public static ApiMeta now(String traceId) {
        ApiMeta meta = new ApiMeta();
        meta.ts = System.currentTimeMillis();
        meta.traceId = traceId;
        return meta;
    }

    public long getTs() {
        return ts;
    }

    public String getTraceId() {
        return traceId;
    }
}
