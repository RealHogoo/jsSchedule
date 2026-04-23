package com.realhogoo.jsschedule.auth.web;

import com.realhogoo.jsschedule.auth.ServicePermissionSupport;
import com.realhogoo.jsschedule.integration.admin.AdminServiceClient;
import org.springframework.context.annotation.Lazy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
public class ScheduleEntryAuthInterceptor implements HandlerInterceptor {

    private final AdminServiceClient adminServiceClient;
    private final String adminServicePublicBaseUrl;
    private final String publicBaseUrl;

    public ScheduleEntryAuthInterceptor(
        @Lazy
        AdminServiceClient adminServiceClient,
        @Value("${admin-service.public-base-url:${admin-service.base-url}}") String adminServicePublicBaseUrl,
        @Value("${app.public-base-url:http://localhost:8082}") String publicBaseUrl
    ) {
        this.adminServiceClient = adminServiceClient;
        this.adminServicePublicBaseUrl = normalizeBaseUrl(adminServicePublicBaseUrl);
        this.publicBaseUrl = normalizeBaseUrl(publicBaseUrl);
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
                response.sendRedirect(request.getContextPath() + "/project.html");
                return false;
            }
            if (!hasRequiredPermission(path, token)) {
                response.sendRedirect(request.getContextPath() + "/project.html");
                return false;
            }
            return true;
        }

        response.sendRedirect(buildAdminLoginUrl(request));
        return false;
    }

    private boolean requiresAuthEntry(String path) {
        return "/".equals(path)
            || "/index.html".equals(path)
            || "/project.html".equals(path)
            || "/dashboard.html".equals(path)
            || "/schedule.html".equals(path)
            || "/task.html".equals(path)
            || "/project-form.html".equals(path)
            || "/task-form.html".equals(path);
    }

    private boolean isValidToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return false;
        }
        try {
            Map<String, Object> currentUser = adminServiceClient.fetchCurrentUser(token.trim());
            return currentUser != null && !currentUser.isEmpty();
        } catch (Exception exception) {
            return false;
        }
    }

    private boolean hasRequiredPermission(String path, String token) {
        if (!requiresServicePermission(path)) {
            return true;
        }
        try {
            Map<String, Object> currentUser = adminServiceClient.fetchCurrentUser(token.trim());
            return ServicePermissionSupport.hasPermission(
                ServicePermissionSupport.parsePermissions(currentUser.get("service_permissions")),
                ServicePermissionSupport.SCHEDULE_SERVICE,
                requiredPermission(path)
            );
        } catch (Exception exception) {
            return false;
        }
    }

    private boolean requiresServicePermission(String path) {
        return "/dashboard.html".equals(path)
            || "/project-form.html".equals(path)
            || "/task-form.html".equals(path);
    }

    private String requiredPermission(String path) {
        if ("/dashboard.html".equals(path)) {
            return ServicePermissionSupport.DASHBOARD_ACCESS;
        }
        return ServicePermissionSupport.WRITE;
    }

    private String buildAdminLoginUrl(HttpServletRequest request) {
        String returnUrl = buildPublicRequestUrl(request);
        String query = request.getQueryString();
        if (query != null && !query.trim().isEmpty()) {
            returnUrl += "?" + query;
        }

        return adminServicePublicBaseUrl
            + "/service-login-page.do?service_nm="
            + URLEncoder.encode("Schedule Service", StandardCharsets.UTF_8)
            + "&return_url="
            + URLEncoder.encode(returnUrl, StandardCharsets.UTF_8);
    }

    private String buildPublicRequestUrl(HttpServletRequest request) {
        if (!publicBaseUrl.isEmpty()) {
            return publicBaseUrl + path(request);
        }

        String scheme = forwardedScheme(request);
        String host = forwardedHost(request);
        int port = forwardedPort(request, scheme);
        String path = request.getRequestURI();

        StringBuilder builder = new StringBuilder();
        builder.append(scheme).append("://").append(host);
        if (!isDefaultPort(scheme, port)) {
            builder.append(":").append(port);
        }
        builder.append(path);
        return builder.toString();
    }

    private String path(HttpServletRequest request) {
        String contextPath = request.getContextPath();
        String uri = request.getRequestURI();
        return contextPath != null && !contextPath.isEmpty() ? uri.substring(contextPath.length()) : uri;
    }

    private String normalizeBaseUrl(String baseUrl) {
        if (baseUrl == null) {
            return "";
        }
        String normalized = baseUrl.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private String forwardedScheme(HttpServletRequest request) {
        String value = firstHeaderValue(request.getHeader("X-Forwarded-Proto"));
        return value == null ? request.getScheme() : value;
    }

    private String forwardedHost(HttpServletRequest request) {
        String value = firstHeaderValue(request.getHeader("X-Forwarded-Host"));
        if (value == null) {
            return request.getServerName();
        }
        try {
            URI uri = URI.create("http://" + value);
            return uri.getHost() == null ? request.getServerName() : uri.getHost();
        } catch (Exception ignored) {
            return value.split(":")[0].trim();
        }
    }

    private int forwardedPort(HttpServletRequest request, String scheme) {
        String forwardedPort = firstHeaderValue(request.getHeader("X-Forwarded-Port"));
        if (forwardedPort != null) {
            try {
                return Integer.parseInt(forwardedPort);
            } catch (NumberFormatException ignored) {
            }
        }

        String forwardedHost = firstHeaderValue(request.getHeader("X-Forwarded-Host"));
        if (forwardedHost != null && forwardedHost.contains(":")) {
            try {
                return Integer.parseInt(forwardedHost.substring(forwardedHost.lastIndexOf(':') + 1).trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return normalizePort(request.getServerPort(), scheme);
    }

    private String firstHeaderValue(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.split(",")[0].trim();
    }

    private int normalizePort(int port, String scheme) {
        if (port > 0) {
            return port;
        }
        return "https".equalsIgnoreCase(scheme) ? 443 : 80;
    }

    private boolean isDefaultPort(String scheme, int port) {
        return ("https".equalsIgnoreCase(scheme) && port == 443)
            || ("http".equalsIgnoreCase(scheme) && port == 80);
    }
}
