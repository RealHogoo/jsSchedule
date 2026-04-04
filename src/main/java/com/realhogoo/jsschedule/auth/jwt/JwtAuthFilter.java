package com.realhogoo.jsschedule.auth.jwt;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.realhogoo.jsschedule.api.ApiCode;
import com.realhogoo.jsschedule.api.ApiResponse;
import com.realhogoo.jsschedule.auth.web.AuthCookieSupport;
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
    private JwtProvider jwtProvider;
    private ServletContext servletContext;

    @Override
    public void init(FilterConfig filterConfig) {
        this.servletContext = filterConfig.getServletContext();
        this.jwtProvider = resolveJwtProvider();
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
            JwtProvider provider = jwtProvider != null ? jwtProvider : resolveJwtProvider();
            if (provider == null) {
                writeJson(httpResponse, 500, ApiResponse.fail(ApiCode.SERVER_ERROR, "jwt provider unavailable", httpRequest));
                return;
            }

            DecodedJWT jwt = provider.verify(token);
            httpRequest.setAttribute("user_id", jwt.getSubject());
            httpRequest.setAttribute("session_id", jwt.getClaim("session_id").asString());
            List<String> roles = jwt.getClaim("roles").asList(String.class);
            httpRequest.setAttribute("roles", roles == null ? Collections.emptyList() : roles);
            httpRequest.setAttribute("access_token", token);

            chain.doFilter(request, response);
        } catch (JWTVerificationException exception) {
            writeJson(httpResponse, 401, ApiResponse.fail(ApiCode.UNAUTHORIZED, "invalid token", httpRequest));
        }
    }

    @Override
    public void destroy() {
    }

    private JwtProvider resolveJwtProvider() {
        WebApplicationContext context = resolveContext();
        if (context == null) {
            return null;
        }
        try {
            return context.getBean(JwtProvider.class);
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
}
