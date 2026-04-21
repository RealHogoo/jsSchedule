package com.realhogoo.jsschedule.auth.web;

import com.realhogoo.jsschedule.auth.ServicePermissionSupport;
import com.realhogoo.jsschedule.integration.admin.AdminServiceClient;
import org.springframework.context.annotation.Lazy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
public class ScheduleEntryAuthInterceptor implements HandlerInterceptor {

    private final AdminServiceClient adminServiceClient;
    private final String adminServiceBaseUrl;

    public ScheduleEntryAuthInterceptor(
        @Lazy
        AdminServiceClient adminServiceClient,
        @Value("${admin-service.base-url}") String adminServiceBaseUrl
    ) {
        this.adminServiceClient = adminServiceClient;
        this.adminServiceBaseUrl = adminServiceBaseUrl == null ? "" : adminServiceBaseUrl.trim();
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
