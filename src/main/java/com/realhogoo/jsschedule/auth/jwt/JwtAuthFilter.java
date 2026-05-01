package com.realhogoo.jsschedule.auth.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.realhogoo.jsschedule.api.ApiCode;
import com.realhogoo.jsschedule.api.ApiResponse;
import com.realhogoo.jsschedule.auth.ServicePermissionSupport;
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
import java.net.URI;
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
            writeJson(httpResponse, 405, ApiResponse.fail(ApiCode.METHOD_NOT_ALLOWED, "\ud5c8\uc6a9\ub418\uc9c0 \uc54a\uc740 \uc694\uccad \ubc29\uc2dd\uc785\ub2c8\ub2e4.", httpRequest));
            return;
        }

        String path = getPath(httpRequest);
        if (PERMIT.contains(path)) {
            chain.doFilter(request, response);
            return;
        }

        String authorizationToken = resolveBearerToken(httpRequest);
        String cookieToken = normalizeToken(AuthCookieSupport.readCookie(httpRequest, AuthCookieSupport.ACCESS_TOKEN_COOKIE));
        String token = authorizationToken.isEmpty() ? cookieToken : authorizationToken;
        if (token.isEmpty()) {
            writeJson(httpResponse, 401, ApiResponse.fail(ApiCode.UNAUTHORIZED, "\ub85c\uadf8\uc778\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.", httpRequest));
            return;
        }
        if (authorizationToken.isEmpty() && cookieToken != null && isCrossSiteRequest(httpRequest)) {
            writeJson(httpResponse, 403, ApiResponse.fail(ApiCode.FORBIDDEN, "\uc778\uc99d \ucfe0\ud0a4\ub97c \uc0ac\uc6a9\ud560 \uc218 \uc5c6\ub294 \uc694\uccad\uc785\ub2c8\ub2e4.", httpRequest));
            return;
        }

        try {
            AdminServiceClient client = adminServiceClient != null ? adminServiceClient : resolveAdminServiceClient();
            if (client == null) {
                writeJson(httpResponse, 500, ApiResponse.fail(ApiCode.SERVER_ERROR, "\uc778\uc99d \uc11c\ube44\uc2a4\uc5d0 \uc5f0\uacb0\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.", httpRequest));
                return;
            }

            Map<String, Object> currentUser = client.fetchCurrentUser(token);
            if (currentUser == null || currentUser.isEmpty()) {
                writeJson(httpResponse, 401, ApiResponse.fail(ApiCode.UNAUTHORIZED, "\ub85c\uadf8\uc778 \uc815\ubcf4\uac00 \uc720\ud6a8\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.", httpRequest));
                return;
            }

            httpRequest.setAttribute("user_id", stringValue(currentUser.get("user_id")));
            httpRequest.setAttribute("session_id", stringValue(currentUser.get("session_id")));
            List<String> roles = rolesValue(currentUser.get("roles"));
            httpRequest.setAttribute("roles", roles == null ? Collections.emptyList() : roles);
            httpRequest.setAttribute("service_permissions", ServicePermissionSupport.parsePermissions(currentUser.get("service_permissions")));
            httpRequest.setAttribute("access_token", token);

            chain.doFilter(request, response);
        } catch (Exception exception) {
            writeJson(httpResponse, 401, ApiResponse.fail(ApiCode.UNAUTHORIZED, "\ub85c\uadf8\uc778 \uc815\ubcf4\uac00 \uc720\ud6a8\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.", httpRequest));
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

    private String resolveBearerToken(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && !authorization.isBlank() && authorization.startsWith("Bearer ")) {
            String token = authorization.substring("Bearer ".length()).trim();
            if (!token.isEmpty()) {
                return token;
            }
        }
        return "";
    }

    private String normalizeToken(String token) {
        return token == null ? "" : token.trim();
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

    private boolean isCrossSiteRequest(HttpServletRequest request) {
        String secFetchSite = request.getHeader("Sec-Fetch-Site");
        if (secFetchSite != null) {
            String normalized = secFetchSite.trim().toLowerCase();
            if ("cross-site".equals(normalized)) {
                return true;
            }
            if ("same-origin".equals(normalized) || "same-site".equals(normalized) || "none".equals(normalized)) {
                return false;
            }
        }
        return !isSameOrigin(request, request.getHeader("Origin")) || !isSameOrigin(request, request.getHeader("Referer"));
    }

    private boolean isSameOrigin(HttpServletRequest request, String source) {
        URI uri;
        if (source == null || source.trim().isEmpty()) {
            return true;
        }
        try {
            uri = URI.create(source.trim());
        } catch (Exception exception) {
            return false;
        }
        String sourceScheme = uri.getScheme();
        String sourceHost = uri.getHost();
        int sourcePort = uri.getPort();
        String requestScheme = forwardedScheme(request);
        String requestHost = forwardedHost(request);
        int requestPort = forwardedPort(request);
        if (sourceScheme == null || sourceHost == null) {
            return false;
        }
        return sourceScheme.equalsIgnoreCase(requestScheme)
            && sourceHost.equalsIgnoreCase(requestHost)
            && normalizePort(sourcePort, sourceScheme) == normalizePort(requestPort, requestScheme);
    }

    private String forwardedScheme(HttpServletRequest request) {
        String value = request.getHeader("X-Forwarded-Proto");
        return value == null || value.trim().isEmpty() ? request.getScheme() : value.trim();
    }

    private String forwardedHost(HttpServletRequest request) {
        String value = request.getHeader("X-Forwarded-Host");
        if (value == null || value.trim().isEmpty()) {
            return request.getServerName();
        }
        return value.split(",")[0].trim().split(":")[0].trim();
    }

    private int forwardedPort(HttpServletRequest request) {
        String scheme = forwardedScheme(request);
        String forwardedPort = request.getHeader("X-Forwarded-Port");
        if (forwardedPort != null && !forwardedPort.trim().isEmpty()) {
            try {
                return normalizePort(Integer.parseInt(forwardedPort.trim()), scheme);
            } catch (NumberFormatException ignored) {
            }
        }
        return normalizePort(request.getServerPort(), scheme);
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
}
