package com.realhogoo.jsschedule.auth.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.realhogoo.jsschedule.api.ApiCode;
import com.realhogoo.jsschedule.api.ApiResponse;
import com.realhogoo.jsschedule.auth.web.AuthCookieSupport;
import com.realhogoo.jsschedule.integration.admin.AdminServiceClient;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.context.support.WebApplicationContextUtils;
import org.springframework.web.servlet.FrameworkServlet;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class JwtAuthFilter implements Filter {
    private static final Set<String> PERMIT = new HashSet<String>(Arrays.asList(
        "/login.json",
        "/auth/refresh.json",
        "/health/live.json",
        "/health/ready.json",
        "/health/status.json"
    ));

    private final ObjectMapper objectMapper = new ObjectMapper();
    private AdminServiceClient adminServiceClient;
    private ServletContext servletContext;

    @Override
    public void init(FilterConfig filterConfig) {
        this.servletContext = filterConfig.getServletContext();
        this.adminServiceClient = resolveAdminServiceClient();
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
        throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        if (!"POST".equalsIgnoreCase(httpRequest.getMethod())) {
            writeJson(httpResponse, 405, ApiResponse.fail(ApiCode.METHOD_NOT_ALLOWED, "POST only", httpRequest));
            return;
        }

        String path = getPath(httpRequest);
        if (PERMIT.contains(path)) {
            chain.doFilter(request, response);
            return;
        }

        String token = resolveToken(httpRequest);
        if (token.isEmpty()) {
            writeJson(httpResponse, 401, ApiResponse.fail(ApiCode.UNAUTHORIZED, "login required", httpRequest));
            return;
        }

        try {
            AdminServiceClient client = adminServiceClient != null ? adminServiceClient : resolveAdminServiceClient();
            if (client == null) {
                writeJson(httpResponse, 500, ApiResponse.fail(ApiCode.SERVER_ERROR, "admin auth client unavailable", httpRequest));
                return;
            }

            Map<String, Object> currentUser = client.fetchCurrentUser(token);
            if (currentUser == null || currentUser.isEmpty()) {
                writeJson(httpResponse, 401, ApiResponse.fail(ApiCode.UNAUTHORIZED, "invalid token", httpRequest));
                return;
            }

            httpRequest.setAttribute("user_id", stringValue(currentUser.get("user_id")));
            httpRequest.setAttribute("session_id", stringValue(currentUser.get("session_id")));
            List<String> roles = rolesValue(currentUser.get("roles"));
            httpRequest.setAttribute("roles", roles == null ? Collections.emptyList() : roles);
            httpRequest.setAttribute("access_token", token);

            chain.doFilter(request, response);
        } catch (Exception exception) {
            writeJson(httpResponse, 401, ApiResponse.fail(ApiCode.UNAUTHORIZED, "invalid token", httpRequest));
        }
    }

    @Override
    public void destroy() {
    }

    private AdminServiceClient resolveAdminServiceClient() {
        WebApplicationContext context = resolveContext();
        if (context == null) {
            return null;
        }
        try {
            return context.getBean(AdminServiceClient.class);
        } catch (Exception ignored) {
            return null;
        }
    }

    private WebApplicationContext resolveContext() {
        if (servletContext == null) {
            return null;
        }
        WebApplicationContext context = WebApplicationContextUtils.getWebApplicationContext(servletContext);
        if (context == null) {
            Object dispatcherContext = servletContext.getAttribute(FrameworkServlet.SERVLET_CONTEXT_PREFIX + "dispatcher");
            if (dispatcherContext instanceof WebApplicationContext) {
                context = (WebApplicationContext) dispatcherContext;
            }
        }
        return context;
    }

    private void writeJson(HttpServletResponse response, int status, Object body) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json; charset=UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    private String getPath(HttpServletRequest request) {
        String contextPath = request.getContextPath();
        String uri = request.getRequestURI();
        return contextPath != null && !contextPath.isEmpty() ? uri.substring(contextPath.length()) : uri;
    }

    private String resolveToken(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && !authorization.isBlank() && authorization.startsWith("Bearer ")) {
            String token = authorization.substring("Bearer ".length()).trim();
            if (!token.isEmpty()) {
                return token;
            }
        }

        String cookieToken = AuthCookieSupport.readCookie(request, AuthCookieSupport.ACCESS_TOKEN_COOKIE);
        return cookieToken == null ? "" : cookieToken;
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    @SuppressWarnings("unchecked")
    private List<String> rolesValue(Object value) {
        if (value instanceof List) {
            return (List<String>) value;
        }
        return Collections.emptyList();
    }
}
