package com.realhogoo.jsschedule.auth.web;

import com.realhogoo.jsschedule.auth.ServicePermissionSupport;
import com.realhogoo.jsschedule.auth.RoleSupport;
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
import java.net.InetAddress;
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
        Map<String, Object> currentUser = fetchCurrentUser(token);
        if (currentUser != null && !currentUser.isEmpty()) {
            if ("/".equals(path) || "/index.html".equals(path)) {
                response.sendRedirect(buildPublicRequestUrl(request, "/project.html"));
                return false;
            }
            if (!hasRequiredPermission(path, currentUser)) {
                response.sendRedirect(buildPublicRequestUrl(request, "/error.html")
                    + "?code=S4003&message="
                    + URLEncoder.encode("권한이 없습니다. 관리자에게 권한 설정을 요청하세요.", StandardCharsets.UTF_8));
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
            || "/wbs.html".equals(path)
            || "/project-form.html".equals(path)
            || "/task-form.html".equals(path);
    }

    private Map<String, Object> fetchCurrentUser(String token) {
        if (token == null || token.trim().isEmpty()) {
            return null;
        }
        try {
            return adminServiceClient.fetchCurrentUser(token.trim());
        } catch (Exception exception) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private boolean hasRequiredPermission(String path, Map<String, Object> currentUser) {
        if (!requiresServicePermission(path)) {
            return true;
        }
        Object roles = currentUser.get("roles");
        if (roles instanceof java.util.List && RoleSupport.isAdmin((java.util.List<String>) roles)) {
            return true;
        }
        return ServicePermissionSupport.hasPermission(
            ServicePermissionSupport.parsePermissions(currentUser.get("service_permissions")),
            ServicePermissionSupport.SCHEDULE_SERVICE,
            requiredPermission(path)
        );
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
        return buildPublicRequestUrl(request, path(request));
    }

    private String buildPublicRequestUrl(HttpServletRequest request, String path) {
        String scheme = forwardedScheme(request);
        String host = forwardedHost(request);
        int port = forwardedPort(request, scheme);

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
        String value = isTrustedForwardedSource(request) ? firstHeaderValue(request.getHeader("X-Forwarded-Proto")) : null;
        if (value != null) {
            return value;
        }
        URI fallback = fallbackPublicUri();
        if (fallback != null && fallback.getScheme() != null && !fallback.getScheme().trim().isEmpty()) {
            return fallback.getScheme().trim();
        }
        return request.getScheme();
    }

    private String forwardedHost(HttpServletRequest request) {
        String value = isTrustedForwardedSource(request) ? firstHeaderValue(request.getHeader("X-Forwarded-Host")) : null;
        if (value != null) {
            try {
                URI uri = URI.create("http://" + value);
                return uri.getHost() == null ? request.getServerName() : uri.getHost();
            } catch (Exception ignored) {
                return value.split(":")[0].trim();
            }
        }
        URI fallback = fallbackPublicUri();
        if (fallback != null && fallback.getHost() != null && !fallback.getHost().trim().isEmpty()) {
            return fallback.getHost().trim();
        }
        return request.getServerName();
    }

    private int forwardedPort(HttpServletRequest request, String scheme) {
        boolean trustedForwardedSource = isTrustedForwardedSource(request);
        String forwardedPort = trustedForwardedSource ? firstHeaderValue(request.getHeader("X-Forwarded-Port")) : null;
        if (forwardedPort != null) {
            try {
                return normalizePort(Integer.parseInt(forwardedPort), scheme);
            } catch (NumberFormatException ignored) {
            }
        }

        String forwardedHost = trustedForwardedSource ? firstHeaderValue(request.getHeader("X-Forwarded-Host")) : null;
        if (forwardedHost != null && forwardedHost.contains(":")) {
            try {
                return normalizePort(Integer.parseInt(forwardedHost.substring(forwardedHost.lastIndexOf(':') + 1).trim()), scheme);
            } catch (NumberFormatException ignored) {
            }
        }

        URI fallback = fallbackPublicUri();
        if (fallback != null) {
            return normalizePort(fallback.getPort(), scheme);
        }
        return normalizePort(request.getServerPort(), scheme);
    }

    private String firstHeaderValue(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.split(",")[0].trim();
    }

    private URI fallbackPublicUri() {
        if (publicBaseUrl == null || publicBaseUrl.isEmpty()) {
            return null;
        }
        try {
            return URI.create(publicBaseUrl);
        } catch (Exception ignored) {
            return null;
        }
    }

    private int normalizePort(int port, String scheme) {
        if ("https".equalsIgnoreCase(scheme) && port == 80) {
            return 443;
        }
        if (port > 0) {
            return port;
        }
        return "https".equalsIgnoreCase(scheme) ? 443 : 80;
    }

    private boolean isDefaultPort(String scheme, int port) {
        return ("https".equalsIgnoreCase(scheme) && port == 443)
            || ("http".equalsIgnoreCase(scheme) && port == 80);
    }

    private boolean isTrustedForwardedSource(HttpServletRequest request) {
        if (request == null) {
            return false;
        }
        String configured = System.getProperty("app.trust-forwarded-headers");
        if (configured == null || configured.trim().isEmpty()) {
            configured = System.getenv("TRUST_FORWARDED_HEADERS");
        }
        if ("true".equalsIgnoreCase(configured)) {
            return true;
        }
        try {
            InetAddress address = InetAddress.getByName(request.getRemoteAddr());
            return address.isLoopbackAddress();
        } catch (Exception ignored) {
            return false;
        }
    }
}
