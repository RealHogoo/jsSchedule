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
        StringBuilder builder = new StringBuilder();
        builder.append(name)
            .append("=")
            .append(URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8))
            .append("; Path=/; Max-Age=")
            .append(maxAge);
        builder.append("; SameSite=Strict; HttpOnly");
        if (isSecureRequest(request)) {
            builder.append("; Secure");
        }
        response.addHeader("Set-Cookie", builder.toString());
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
