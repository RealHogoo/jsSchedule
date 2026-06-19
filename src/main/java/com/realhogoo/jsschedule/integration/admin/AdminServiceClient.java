package com.realhogoo.jsschedule.integration.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.realhogoo.jsschedule.api.ApiCode;
import com.realhogoo.jsschedule.api.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AdminServiceClient {
    private static final long CURRENT_USER_CACHE_TTL_MILLIS = 5000L;

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
        new ParameterizedTypeReference<Map<String, Object>>() {
        };

    private static final com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>> JACKSON_MAP_TYPE =
        new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {
    };

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String adminServiceBaseUrl;
    private final String internalApiToken;
    private final ConcurrentHashMap<String, CachedCurrentUser> currentUserCache = new ConcurrentHashMap<String, CachedCurrentUser>();

    public AdminServiceClient(
        RestTemplate restTemplate,
        ObjectMapper objectMapper,
        @Value("${admin-service.base-url}") String adminServiceBaseUrl,
        @Value("${admin-service.internal-api-token:}") String internalApiToken
    ) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.adminServiceBaseUrl = adminServiceBaseUrl == null ? "" : adminServiceBaseUrl.trim();
        this.internalApiToken = internalApiToken == null ? "" : internalApiToken.trim();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> fetchCurrentUser(String accessToken) {
        if (accessToken == null || accessToken.trim().isEmpty()) {
            return Collections.emptyMap();
        }
        String token = accessToken.trim();
        long now = System.currentTimeMillis();
        CachedCurrentUser cached = currentUserCache.get(token);
        if (cached != null && cached.expiresAtMillis > now) {
            return new LinkedHashMap<String, Object>(cached.currentUser);
        }

        Map<String, Object> response = post("/auth/me.json", Collections.<String, Object>emptyMap(), token);
        Object data = response.get("data");
        if (data instanceof Map) {
            Map<String, Object> currentUser = new LinkedHashMap<String, Object>((Map<String, Object>) data);
            if (!currentUser.isEmpty()) {
                currentUserCache.put(token, new CachedCurrentUser(currentUser, now + CURRENT_USER_CACHE_TTL_MILLIS));
            }
            return currentUser;
        }
        currentUserCache.remove(token);
        return Collections.emptyMap();
    }

    public Map<String, Object> login(Map<String, Object> body) {
        return post("/login.json", body, null);
    }

    public Map<String, Object> refresh(Map<String, Object> body) {
        return post("/auth/refresh.json", body, null);
    }

    public Map<String, Object> me(String accessToken) {
        return post("/auth/me.json", Collections.<String, Object>emptyMap(), accessToken);
    }

    public Map<String, Object> logout(String accessToken) {
        return post("/logout.json", Collections.<String, Object>emptyMap(), accessToken);
    }

    public Map<String, Object> userOptions(Map<String, Object> body, String accessToken) {
        return post("/user/options.json", body, accessToken);
    }

    public boolean isServiceDisabled(String serviceCode, String accessToken) {
        if (serviceCode == null || serviceCode.trim().isEmpty() || internalApiToken.isEmpty()) {
            return false;
        }
        Map<String, Object> response;
        try {
            Map<String, Object> body = new LinkedHashMap<String, Object>();
            body.put("service_cd", normalizeCode(serviceCode));
            response = internalPost("/internal/service/use-status.json", body);
        } catch (Exception exception) {
            return false;
        }
        Object data = response.get("data");
        if (!(data instanceof Map)) {
            return false;
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> row = (Map<String, Object>) data;
        return normalizeCode(serviceCode).equals(normalizeCode(row.get("service_cd")))
            && "N".equalsIgnoreCase(String.valueOf(row.get("use_yn")));
    }

    private Map<String, Object> post(String path, Map<String, Object> body, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (accessToken != null && !accessToken.trim().isEmpty()) {
            headers.setBearerAuth(accessToken.trim());
        }

        HttpEntity<Map<String, Object>> entity = new HttpEntity<Map<String, Object>>(
            body == null ? Collections.<String, Object>emptyMap() : body,
            headers
        );

        try {
            Map<String, Object> response = restTemplate.exchange(
                adminServiceBaseUrl + path,
                HttpMethod.POST,
                entity,
                MAP_TYPE
            ).getBody();
            return response == null ? Collections.<String, Object>emptyMap() : response;
        } catch (HttpStatusCodeException exception) {
            return parseErrorBody(exception.getResponseBodyAsString(), exception.getStatusCode());
        } catch (RestClientException exception) {
            throw new ApiException(ApiCode.SERVER_ERROR, HttpStatus.BAD_GATEWAY, "어드민 서비스 요청에 실패했습니다.");
        }
    }

    private Map<String, Object> internalPost(String path, Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Api-Token", internalApiToken);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<Map<String, Object>>(
            body == null ? Collections.<String, Object>emptyMap() : body,
            headers
        );

        try {
            Map<String, Object> response = restTemplate.exchange(
                adminServiceBaseUrl + path,
                HttpMethod.POST,
                entity,
                MAP_TYPE
            ).getBody();
            return response == null ? Collections.<String, Object>emptyMap() : response;
        } catch (HttpStatusCodeException exception) {
            return parseErrorBody(exception.getResponseBodyAsString(), exception.getStatusCode());
        } catch (RestClientException exception) {
            throw new ApiException(ApiCode.SERVER_ERROR, HttpStatus.BAD_GATEWAY, "?대뱶誘??쒕퉬???붿껌???ㅽ뙣?덉뒿?덈떎.");
        }
    }

    private Map<String, Object> parseErrorBody(String body, HttpStatus statusCode) {
        if (body != null && !body.trim().isEmpty()) {
            try {
                return objectMapper.readValue(body, JACKSON_MAP_TYPE);
            } catch (Exception ignored) {
            }
        }

        Map<String, Object> fallback = new LinkedHashMap<String, Object>();
        fallback.put("ok", false);
        fallback.put("code", statusCode.value() == 401 ? ApiCode.UNAUTHORIZED.name() : ApiCode.SERVER_ERROR.name());
        fallback.put("message", statusCode.value() == 401 ? "로그인이 필요합니다." : "어드민 서비스 요청에 실패했습니다.");
        fallback.put("data", null);
        return fallback;
    }

    private String normalizeCode(Object value) {
        if (value == null) {
            return "";
        }
        return String.valueOf(value).trim().replace('-', '_').replace(' ', '_').toUpperCase();
    }

    private static final class CachedCurrentUser {
        private final Map<String, Object> currentUser;
        private final long expiresAtMillis;

        private CachedCurrentUser(Map<String, Object> currentUser, long expiresAtMillis) {
            this.currentUser = currentUser;
            this.expiresAtMillis = expiresAtMillis;
        }
    }
}
