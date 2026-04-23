package com.realhogoo.jsschedule.auth.web;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public final class AuthCookieSupport {
    public static final String ACCESS_TOKEN_COOKIE = "ACCESS_TOKEN";
    public static final String REFRESH_TOKEN_COOKIE = "REFRESH_TOKEN";
    public static final String SESSION_ID_COOKIE = "LOGIN_SESSION_ID";

    private static final int ACCESS_TOKEN_MAX_AGE = 60 * 60;
    private static final int REFRESH_TOKEN_MAX_AGE = 14 * 24 * 60 * 60;
    private static final int SESSION_ID_MAX_AGE = 14 * 24 * 60 * 60;

    private AuthCookieSupport() {
    }

    public static void writeAuthCookies(HttpServletRequest request, HttpServletResponse response, String accessToken, String refreshToken, String sessionId) {
        addCookie(request, response, ACCESS_TOKEN_COOKIE, accessToken, ACCESS_TOKEN_MAX_AGE);
        addCookie(request, response, REFRESH_TOKEN_COOKIE, refreshToken, REFRESH_TOKEN_MAX_AGE);
        addCookie(request, response, SESSION_ID_COOKIE, sessionId, SESSION_ID_MAX_AGE);
    }

    public static void clearAuthCookies(HttpServletRequest request, HttpServletResponse response) {
        addCookie(request, response, ACCESS_TOKEN_COOKIE, "", 0);
        addCookie(request, response, REFRESH_TOKEN_COOKIE, "", 0);
        addCookie(request, response, SESSION_ID_COOKIE, "", 0);
    }

    public static String readCookie(HttpServletRequest request, String name) {
        if (request == null || name == null || name.trim().isEmpty()) {
            return null;
        }

        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (cookie != null && name.equals(cookie.getName())) {
                String value = cookie.getValue();
                if (value == null || value.trim().isEmpty()) {
                    return null;
                }
                return URLDecoder.decode(value.trim(), StandardCharsets.UTF_8);
            }
        }
        return null;
    }

    private static void addCookie(HttpServletRequest request, HttpServletResponse response, String name, String value, int maxAge) {
        String cookieDomain = resolveCookieDomain(request);
        StringBuilder builder = new StringBuilder();
        builder.append(name)
            .append("=")
            .append(URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8))
            .append("; Path=/; Max-Age=")
            .append(maxAge);
        if (cookieDomain != null) {
            builder.append("; Domain=").append(cookieDomain);
        }
        builder.append("; SameSite=Strict; HttpOnly");
        if (isSecureRequest(request)) {
            builder.append("; Secure");
        }
        response.addHeader("Set-Cookie", builder.toString());
    }

    private static String resolveCookieDomain(HttpServletRequest request) {
        String configured = trimToNull(System.getProperty("auth.cookie.domain"));
        if (configured == null) {
            configured = trimToNull(System.getenv("COOKIE_DOMAIN"));
        }
        if (configured != null) {
            return stripLeadingDot(configured);
        }

        String host = forwardedHost(request);
        if (host == null || "localhost".equalsIgnoreCase(host) || isIpv4(host)) {
            return null;
        }

        int firstDotIndex = host.indexOf('.');
        if (firstDotIndex < 0 || firstDotIndex == host.length() - 1) {
            return null;
        }
        return host.substring(firstDotIndex + 1);
    }

    private static String forwardedHost(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String forwardedHost = trimToNull(firstHeaderValue(request.getHeader("X-Forwarded-Host")));
        String host = forwardedHost == null ? trimToNull(request.getServerName()) : forwardedHost;
        if (host == null) {
            return null;
        }
        int colonIndex = host.indexOf(':');
        return colonIndex >= 0 ? host.substring(0, colonIndex).trim() : host;
    }

    private static String firstHeaderValue(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.split(",")[0].trim();
    }

    private static boolean isIpv4(String host) {
        return host.matches("\\d+\\.\\d+\\.\\d+\\.\\d+");
    }

    private static String stripLeadingDot(String value) {
        String normalized = value;
        while (normalized.startsWith(".")) {
            normalized = normalized.substring(1);
        }
        return normalized.isEmpty() ? null : normalized;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static boolean isSecureRequest(HttpServletRequest request) {
        if (request == null) {
            return false;
        }
        if (request.isSecure()) {
            return true;
        }
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        return forwardedProto != null && "https".equalsIgnoreCase(forwardedProto.trim());
    }
}
