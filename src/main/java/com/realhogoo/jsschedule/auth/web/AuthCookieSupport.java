package com.realhogoo.jsschedule.auth.web;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public final class AuthCookieSupport {
    public static final String ACCESS_TOKEN_COOKIE = "ACCESS_TOKEN";
    public static final String REFRESH_TOKEN_COOKIE = "REFRESH_TOKEN";
    public static final String SESSION_ID_COOKIE = "LOGIN_SESSION_ID";

    private static final int ACCESS_TOKEN_MAX_AGE = 60 * 60;
    private static final int REFRESH_TOKEN_MAX_AGE = 14 * 24 * 60 * 60;
    private static final int SESSION_ID_MAX_AGE = 14 * 24 * 60 * 60;

    private AuthCookieSupport() {
    }

    public static void writeAuthCookies(HttpServletResponse response, String accessToken, String refreshToken, String sessionId) {
        addCookie(response, ACCESS_TOKEN_COOKIE, accessToken, ACCESS_TOKEN_MAX_AGE);
        addCookie(response, REFRESH_TOKEN_COOKIE, refreshToken, REFRESH_TOKEN_MAX_AGE);
        addCookie(response, SESSION_ID_COOKIE, sessionId, SESSION_ID_MAX_AGE);
    }

    public static void clearAuthCookies(HttpServletResponse response) {
        addCookie(response, ACCESS_TOKEN_COOKIE, "", 0);
        addCookie(response, REFRESH_TOKEN_COOKIE, "", 0);
        addCookie(response, SESSION_ID_COOKIE, "", 0);
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
                return value == null || value.trim().isEmpty() ? null : value.trim();
            }
        }
        return null;
    }

    private static void addCookie(HttpServletResponse response, String name, String value, int maxAge) {
        StringBuilder builder = new StringBuilder();
        builder.append(name).append("=").append(value == null ? "" : value).append("; Path=/; Max-Age=").append(maxAge);
        builder.append("; SameSite=Lax; HttpOnly");
        response.addHeader("Set-Cookie", builder.toString());
    }
}
