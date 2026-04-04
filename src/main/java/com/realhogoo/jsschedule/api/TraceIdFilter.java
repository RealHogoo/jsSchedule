package com.realhogoo.jsschedule.api;

import org.apache.logging.log4j.ThreadContext;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import java.io.IOException;

public class TraceIdFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig) {
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
        throws IOException, ServletException {
        String traceId = TraceId.newId();
        if (request instanceof HttpServletRequest) {
            request.setAttribute("trace_id", traceId);
            ThreadContext.put("traceId", traceId);
        }
        try {
            chain.doFilter(request, response);
        } finally {
            ThreadContext.remove("traceId");
        }
    }

    @Override
    public void destroy() {
    }
}
