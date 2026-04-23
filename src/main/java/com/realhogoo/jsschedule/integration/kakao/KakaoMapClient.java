package com.realhogoo.jsschedule.integration.kakao;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class KakaoMapClient {
    private static final Logger log = LoggerFactory.getLogger(KakaoMapClient.class);
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<Map<String, Object>>() {
    };

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String restApiKey;

    public KakaoMapClient(
        ObjectMapper objectMapper,
        @Value("${kakao.rest-api-key:}") String restApiKey,
        @Value("${kakao.connect-timeout-ms:3000}") long connectTimeoutMs,
        @Value("${kakao.read-timeout-ms:5000}") long readTimeoutMs
    ) {
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(connectTimeoutMs))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
        this.objectMapper = objectMapper;
        this.restApiKey = restApiKey == null ? "" : restApiKey.trim();
        this.requestTimeout = Duration.ofMillis(readTimeoutMs);
    }

    private final Duration requestTimeout;

    public boolean isConfigured() {
        return !restApiKey.isEmpty();
    }

    public Map<String, Object> searchAddresses(String keyword, int currentPage, int countPerPage) {
        String query = normalizeAddress(keyword);
        if (query.isEmpty()) {
            throw new IllegalArgumentException("keyword is required");
        }

        Map<String, Object> addressBody = searchAddressDocuments(query, currentPage, countPerPage);
        log.debug(
            "KAKAO_ADDRESS_SEARCH query='{}' docs={} meta={}",
            query,
            listSize(addressBody.get("documents")),
            addressBody.get("meta")
        );
        List<Map<String, Object>> items = toAddressItems(addressBody, false);
        Map<String, Object> meta = asMap(addressBody.get("meta"));
        if (items.isEmpty() && shouldFallbackToKeywordSearch(query)) {
            Map<String, Object> keywordBody = searchKeywordDocuments(query, currentPage, countPerPage);
            log.debug(
                "KAKAO_KEYWORD_SEARCH query='{}' docs={} meta={}",
                query,
                listSize(keywordBody.get("documents")),
                keywordBody.get("meta")
            );
            items = toAddressItems(keywordBody, true);
            meta = asMap(keywordBody.get("meta"));
        }
        log.debug("KAKAO_SEARCH_ITEMS query='{}' items={}", query, items.size());

        Map<String, Object> response = new LinkedHashMap<String, Object>();
        response.put("available", true);
        response.put("keyword", query);
        response.put("current_page", currentPage);
        response.put("count_per_page", countPerPage);
        response.put("total_count", intValue(meta.get("total_count"), items.size()));
        response.put("is_end", booleanValue(meta.get("is_end")));
        response.put("items", items);
        return response;
    }

    public Map<String, Object> resolveRoute(String originAddress, String destinationAddress) {
        Map<String, Object> origin = geocode(originAddress);
        Map<String, Object> destination = geocode(destinationAddress);
        Map<String, Object> route = directions(
            number(origin.get("longitude")),
            number(origin.get("latitude")),
            number(destination.get("longitude")),
            number(destination.get("latitude"))
        );

        Map<String, Object> response = new LinkedHashMap<String, Object>();
        response.put("available", true);
        response.put("origin", origin);
        response.put("destination", destination);
        response.put("distance_meters", route.get("distance_meters"));
        response.put("duration_seconds", route.get("duration_seconds"));
        response.put("path", route.get("path"));
        return response;
    }

    private Map<String, Object> geocode(String address) {
        List<?> documents = geocodeDocuments(address);
        if (documents.isEmpty()) {
            String normalized = normalizeAddress(address);
            if (!normalized.equals(address)) {
                documents = geocodeDocuments(normalized);
            }
        }
        if (documents.isEmpty() || !(documents.get(0) instanceof Map)) {
            throw new IllegalStateException("address not found");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> document = (Map<String, Object>) documents.get(0);
        String x = text(document.get("x"));
        String y = text(document.get("y"));
        if (x == null || y == null) {
            throw new IllegalStateException("address coordinates not found");
        }

        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("address", preferredAddress(document));
        result.put("longitude", Double.valueOf(x));
        result.put("latitude", Double.valueOf(y));
        return result;
    }

    private Map<String, Object> searchAddressDocuments(String address, int currentPage, int countPerPage) {
        HttpHeaders headers = authorizationHeaders();
        HttpEntity<Void> entity = new HttpEntity<Void>(headers);
        String uri = UriComponentsBuilder
            .fromHttpUrl("https://dapi.kakao.com/v2/local/search/address.json")
            .queryParam("query", address)
            .queryParam("page", currentPage)
            .queryParam("size", countPerPage)
            .encode()
            .build()
            .toUriString();
        return exchange(uri, entity);
    }

    private Map<String, Object> searchKeywordDocuments(String keyword, int currentPage, int countPerPage) {
        HttpHeaders headers = authorizationHeaders();
        HttpEntity<Void> entity = new HttpEntity<Void>(headers);
        String uri = UriComponentsBuilder
            .fromHttpUrl("https://dapi.kakao.com/v2/local/search/keyword.json")
            .queryParam("query", keyword)
            .queryParam("page", currentPage)
            .queryParam("size", countPerPage)
            .encode()
            .build()
            .toUriString();
        return exchange(uri, entity);
    }

    private List<?> geocodeDocuments(String address) {
        HttpHeaders headers = authorizationHeaders();
        HttpEntity<Void> entity = new HttpEntity<Void>(headers);
        String uri = UriComponentsBuilder
            .fromHttpUrl("https://dapi.kakao.com/v2/local/search/address.json")
            .queryParam("query", address)
            .encode()
            .build()
            .toUriString();

        Map<String, Object> body = exchange(uri, entity);
        return body.get("documents") instanceof List ? (List<?>) body.get("documents") : Collections.emptyList();
    }

    private List<Map<String, Object>> toAddressItems(Map<String, Object> body, boolean keywordSearch) {
        List<Map<String, Object>> items = new ArrayList<Map<String, Object>>();
        List<?> documents = body.get("documents") instanceof List ? (List<?>) body.get("documents") : Collections.emptyList();
        for (Object documentObj : documents) {
            if (!(documentObj instanceof Map)) {
                continue;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> document = (Map<String, Object>) documentObj;
            @SuppressWarnings("unchecked")
            Map<String, Object> roadAddress = document.get("road_address") instanceof Map ? (Map<String, Object>) document.get("road_address") : null;
            @SuppressWarnings("unchecked")
            Map<String, Object> address = document.get("address") instanceof Map ? (Map<String, Object>) document.get("address") : null;
            String road = roadAddress == null ? null : text(roadAddress.get("address_name"));
            String jibun = address == null ? null : text(address.get("address_name"));
            String selected = road != null ? road : jibun;
            if (selected == null) {
                selected = normalizeAddress(text(document.get("address_name")));
            }
            if (selected == null) {
                continue;
            }

            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("selected_address", normalizeAddress(selected));
            item.put("road_address", normalizeAddress(road));
            item.put("road_address_part1", normalizeAddress(road));
            item.put("jibun_address", normalizeAddress(jibun));
            item.put("zip_no", roadAddress == null ? null : text(roadAddress.get("zone_no")));
            item.put("building_name", keywordSearch ? text(document.get("place_name")) : null);
            item.put("place_name", text(document.get("place_name")));
            item.put("address_name", normalizeAddress(text(document.get("address_name"))));
            item.put("longitude", text(document.get("x")));
            item.put("latitude", text(document.get("y")));
            items.add(item);
        }
        return items;
    }

    private Map<String, Object> directions(double originLng, double originLat, double destinationLng, double destinationLat) {
        HttpHeaders headers = authorizationHeaders();
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        HttpEntity<Void> entity = new HttpEntity<Void>(headers);
        String uri = UriComponentsBuilder
            .fromHttpUrl("https://apis-navi.kakaomobility.com/v1/directions")
            .queryParam("origin", originLng + "," + originLat)
            .queryParam("destination", destinationLng + "," + destinationLat)
            .queryParam("priority", "RECOMMEND")
            .queryParam("summary", "false")
            .encode()
            .build()
            .toUriString();

        Map<String, Object> body = exchange(uri, entity);
        List<?> routes = body.get("routes") instanceof List ? (List<?>) body.get("routes") : Collections.emptyList();
        if (routes.isEmpty() || !(routes.get(0) instanceof Map)) {
            throw new IllegalStateException("route not found");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> route = (Map<String, Object>) routes.get(0);
        @SuppressWarnings("unchecked")
        Map<String, Object> summary = route.get("summary") instanceof Map ? (Map<String, Object>) route.get("summary") : Collections.<String, Object>emptyMap();

        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("distance_meters", longValue(summary.get("distance")));
        result.put("duration_seconds", longValue(summary.get("duration")));
        result.put("path", extractPath(route));
        return result;
    }

    private List<Map<String, Object>> extractPath(Map<String, Object> route) {
        List<Map<String, Object>> path = new ArrayList<Map<String, Object>>();
        List<?> sections = route.get("sections") instanceof List ? (List<?>) route.get("sections") : Collections.emptyList();
        for (Object sectionObj : sections) {
            if (!(sectionObj instanceof Map)) {
                continue;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> section = (Map<String, Object>) sectionObj;
            List<?> roads = section.get("roads") instanceof List ? (List<?>) section.get("roads") : Collections.emptyList();
            for (Object roadObj : roads) {
                if (!(roadObj instanceof Map)) {
                    continue;
                }
                @SuppressWarnings("unchecked")
                Map<String, Object> road = (Map<String, Object>) roadObj;
                List<?> vertexes = road.get("vertexes") instanceof List ? (List<?>) road.get("vertexes") : Collections.emptyList();
                for (int index = 0; index + 1 < vertexes.size(); index += 2) {
                    Map<String, Object> point = new LinkedHashMap<String, Object>();
                    point.put("longitude", number(vertexes.get(index)));
                    point.put("latitude", number(vertexes.get(index + 1)));
                    path.add(point);
                }
            }
        }
        return path;
    }

    private HttpHeaders authorizationHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "KakaoAK " + restApiKey);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        return headers;
    }

    private Map<String, Object> exchange(String uri, HttpEntity<?> entity) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(uri))
                .timeout(requestTimeout)
                .GET();
            HttpHeaders headers = entity.getHeaders();
            for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
                for (String value : entry.getValue()) {
                    builder.header(entry.getKey(), value);
                }
            }

            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("KAKAO_API_FAIL status={} uri={} body={}", response.statusCode(), uri, response.body());
                throw new IllegalStateException("kakao api request failed");
            }
            if (response.body() == null || response.body().trim().isEmpty()) {
                return Collections.emptyMap();
            }
            return objectMapper.readValue(response.body(), MAP_TYPE);
        } catch (IOException exception) {
            log.warn(
                "KAKAO_API_FAIL uri={} message={}",
                uri,
                exception.getMessage()
            );
            throw new IllegalStateException("kakao api request failed", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            log.warn("KAKAO_API_FAIL uri={} message={}", uri, exception.getMessage());
            throw new IllegalStateException("kakao api request failed", exception);
        }
    }

    private String preferredAddress(Map<String, Object> document) {
        @SuppressWarnings("unchecked")
        Map<String, Object> roadAddress = document.get("road_address") instanceof Map ? (Map<String, Object>) document.get("road_address") : null;
        @SuppressWarnings("unchecked")
        Map<String, Object> address = document.get("address") instanceof Map ? (Map<String, Object>) document.get("address") : null;
        if (roadAddress != null && text(roadAddress.get("address_name")) != null) {
            return text(roadAddress.get("address_name"));
        }
        if (address != null && text(address.get("address_name")) != null) {
            return text(address.get("address_name"));
        }
        return text(document.get("address_name"));
    }

    private String normalizeAddress(String address) {
        String text = this.text(address);
        if (text == null) {
            return "";
        }
        return text.replaceAll("\\s*\\([^)]*\\)\\s*$", "").trim();
    }

    private boolean shouldFallbackToKeywordSearch(String query) {
        if (query == null || query.isEmpty()) {
            return false;
        }
        if (query.matches(".*\\d.*")) {
            return false;
        }
        return query.length() <= 20;
    }

    private Map<String, Object> asMap(Object value) {
        if (!(value instanceof Map)) {
            return Collections.emptyMap();
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> map = (Map<String, Object>) value;
        return map;
    }

    private String text(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private double number(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return Double.parseDouble(String.valueOf(value));
    }

    private long longValue(Object value) {
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        return Math.round(Double.parseDouble(String.valueOf(value)));
    }

    private int intValue(Object value, int fallback) {
        if (value == null) {
            return fallback;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException exception) {
            return fallback;
        }
    }

    private boolean booleanValue(Object value) {
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        return value != null && Boolean.parseBoolean(String.valueOf(value));
    }

    private int listSize(Object value) {
        return value instanceof List ? ((List<?>) value).size() : 0;
    }
}
