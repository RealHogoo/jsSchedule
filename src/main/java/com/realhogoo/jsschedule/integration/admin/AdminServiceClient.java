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

@Component
public class AdminServiceClient {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
        new ParameterizedTypeReference<Map<String, Object>>() {
        };

    private static final com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>> JACKSON_MAP_TYPE =
        new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {
    };

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String adminServiceBaseUrl;

    public AdminServiceClient(
        RestTemplate restTemplate,
        ObjectMapper objectMapper,
        @Value("${admin-service.base-url}") String adminServiceBaseUrl
    ) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.adminServiceBaseUrl = adminServiceBaseUrl == null ? "" : adminServiceBaseUrl.trim();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> fetchCurrentUser(String accessToken) {
        if (accessToken == null || accessToken.trim().isEmpty()) {
            return Collections.emptyMap();
        }

        Map<String, Object> response = post("/auth/me.json", Collections.<String, Object>emptyMap(), accessToken);
        Object data = response.get("data");
        if (data instanceof Map) {
            return (Map<String, Object>) data;
        }
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
}
