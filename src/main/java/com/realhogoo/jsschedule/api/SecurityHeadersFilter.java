package com.realhogoo.jsschedule.api;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class SecurityHeadersFilter implements Filter {

    private static final String CONTENT_SECURITY_POLICY =
        "default-src 'self'; " +
        "script-src 'self'; " +
        "connect-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; " +
        "font-src 'self' data:; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-src 'none'; " +
        "manifest-src 'self'; " +
        "frame-ancestors 'none'";

    @Override
    public void init(FilterConfig filterConfig) {
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
        throws IOException, ServletException {
        if (response instanceof HttpServletResponse) {
            HttpServletResponse httpResponse = (HttpServletResponse) response;
            httpResponse.setHeader("X-Content-Type-Options", "nosniff");
            httpResponse.setHeader("X-Frame-Options", "DENY");
            httpResponse.setHeader("X-Permitted-Cross-Domain-Policies", "none");
            httpResponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
            httpResponse.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
            httpResponse.setHeader("Cross-Origin-Opener-Policy", "same-origin");
            httpResponse.setHeader("Cross-Origin-Resource-Policy", "same-origin");
            httpResponse.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
            if (((javax.servlet.http.HttpServletRequest) request).isSecure()) {
                httpResponse.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
            }
        }
        chain.doFilter(request, response);
    }

    @Override
    public void destroy() {
    }
}
