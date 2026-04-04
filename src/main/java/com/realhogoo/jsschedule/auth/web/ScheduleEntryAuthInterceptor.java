package com.realhogoo.jsschedule.auth.web;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.realhogoo.jsschedule.auth.jwt.JwtProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public class ScheduleEntryAuthInterceptor implements HandlerInterceptor {

    private final JwtProvider jwtProvider;
    private final String adminServiceBaseUrl;

    public ScheduleEntryAuthInterceptor(
        JwtProvider jwtProvider,
        @Value("${admin-service.base-url}") String adminServiceBaseUrl
    ) {
        this.jwtProvider = jwtProvider;
        this.adminServiceBaseUrl = adminServiceBaseUrl;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = path(request);
        if (!requiresAuthEntry(path)) {
            return true;
        }

        String token = AuthCookieSupport.readCookie(request, AuthCookieSupport.ACCESS_TOKEN_COOKIE);
        if (isValidToken(token)) {
            if ("/".equals(path) || "/index.html".equals(path)) {
                response.sendRedirect(request.getContextPath() + "/schedule.html");
                return false;
            }
            return true;
        }

        response.sendRedirect(buildAdminLoginUrl(request));
        return false;
    }

    private boolean requiresAuthEntry(String path) {
        return "/".equals(path) || "/index.html".equals(path) || "/schedule.html".equals(path);
    }

    private boolean isValidToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return false;
        }
        try {
            jwtProvider.verify(token.trim());
            return true;
        } catch (JWTVerificationException exception) {
            return false;
        }
    }

    private String buildAdminLoginUrl(HttpServletRequest request) {
        String returnUrl = request.getRequestURL().toString();
        String query = request.getQueryString();
        if (query != null && !query.trim().isEmpty()) {
            returnUrl += "?" + query;
        }

        return adminServiceBaseUrl
            + "/service-login-page.do?service_nm="
            + URLEncoder.encode("Schedule Service", StandardCharsets.UTF_8)
            + "&return_url="
            + URLEncoder.encode(returnUrl, StandardCharsets.UTF_8);
    }

    private String path(HttpServletRequest request) {
        String contextPath = request.getContextPath();
        String uri = request.getRequestURI();
        return contextPath != null && !contextPath.isEmpty() ? uri.substring(contextPath.length()) : uri;
    }
}
