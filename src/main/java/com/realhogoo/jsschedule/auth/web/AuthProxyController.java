package com.realhogoo.jsschedule.auth.web;

import com.realhogoo.jsschedule.integration.admin.AdminServiceClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Collections;
import java.util.Map;

@RestController
public class AuthProxyController {

    private final AdminServiceClient adminServiceClient;

    public AuthProxyController(AdminServiceClient adminServiceClient) {
        this.adminServiceClient = adminServiceClient;
    }

    @PostMapping("/login.json")
    public Map<String, Object> login(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request, HttpServletResponse response) {
        Map<String, Object> result = adminServiceClient.login(body);
        applyNoStore(response);
        syncCookies(result, request, response);
        return result;
    }

    @PostMapping("/auth/refresh.json")
    public Map<String, Object> refresh(
        @RequestBody(required = false) Map<String, Object> body,
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        Map<String, Object> payload = body;
        if (payload == null || payload.isEmpty()) {
            String refreshToken = AuthCookieSupport.readCookie(request, AuthCookieSupport.REFRESH_TOKEN_COOKIE);
            if (refreshToken != null) {
                payload = Collections.<String, Object>singletonMap("refresh_token", refreshToken);
            }
        }
        Map<String, Object> result = adminServiceClient.refresh(payload);
        applyNoStore(response);
        syncCookies(result, request, response);
        return result;
    }

    @PostMapping("/auth/me.json")
    public Map<String, Object> me(@RequestHeader(name = "Authorization", required = false) String authorization, HttpServletRequest request) {
        return adminServiceClient.me(resolveToken(authorization, request));
    }

    @PostMapping("/logout.json")
    public Map<String, Object> logout(
        @RequestHeader(name = "Authorization", required = false) String authorization,
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        Map<String, Object> result = adminServiceClient.logout(resolveToken(authorization, request));
        applyNoStore(response);
        AuthCookieSupport.clearAuthCookies(request, response);
        return result;
    }

    private String extractBearerToken(String authorization) {
        if (authorization == null) {
            return null;
        }

        String trimmed = authorization.trim();
        if (!trimmed.startsWith("Bearer ")) {
            return null;
        }

        String token = trimmed.substring("Bearer ".length()).trim();
        return token.isEmpty() ? null : token;
    }

    private String resolveToken(String authorization, HttpServletRequest request) {
        String token = extractBearerToken(authorization);
        if (token != null) {
            return token;
        }
        return AuthCookieSupport.readCookie(request, AuthCookieSupport.ACCESS_TOKEN_COOKIE);
    }

    @SuppressWarnings("unchecked")
    private void syncCookies(Map<String, Object> result, HttpServletRequest request, HttpServletResponse response) {
        if (!(result != null && Boolean.TRUE.equals(result.get("ok")))) {
            AuthCookieSupport.clearAuthCookies(request, response);
            return;
        }

        Object dataObj = result.get("data");
        if (!(dataObj instanceof Map)) {
            AuthCookieSupport.clearAuthCookies(request, response);
            return;
        }

        Map<String, Object> data = (Map<String, Object>) dataObj;
        AuthCookieSupport.writeAuthCookies(
            request,
            response,
            stringValue(data.get("token")),
            stringValue(data.get("refresh_token")),
            stringValue(data.get("session_id"))
        );
    }

    private void applyNoStore(HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Expires", "0");
    }

    private String stringValue(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }
}
