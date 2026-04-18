package com.realhogoo.jsschedule.integration.juso;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class JusoAddressClient {
    private static final Logger log = LoggerFactory.getLogger(JusoAddressClient.class);

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
        new ParameterizedTypeReference<Map<String, Object>>() {
        };
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final RestTemplate restTemplate;
    private final String confirmationKey;

    public JusoAddressClient(
        RestTemplate restTemplate,
        @Value("${juso.confirmation-key:}") String confirmationKey
    ) {
        this.restTemplate = restTemplate;
        this.confirmationKey = confirmationKey == null ? "" : confirmationKey.trim();
    }

    public boolean isConfigured() {
        return !confirmationKey.isEmpty();
    }

    public Map<String, Object> search(String keyword, int currentPage, int countPerPage) {
        String normalizedKeyword = sanitizeKeyword(keyword);
        if (normalizedKeyword.isEmpty()) {
            throw new IllegalArgumentException("keyword is required");
        }
        log.info(
            "JUSO_SEARCH request raw='{}' normalized='{}' keySuffix={}",
            printable(keyword),
            printable(normalizedKeyword),
            keySuffix()
        );

        String uri = "https://business.juso.go.kr/addrlink/addrLinkApi.do"
            + "?confmKey=" + confirmationKey
            + "&currentPage=" + currentPage
            + "&countPerPage=" + countPerPage
            + "&keyword=" + URLEncoder.encode(normalizedKeyword, StandardCharsets.UTF_8)
            + "&resultType=json";

        Map<String, Object> body = exchange(uri);
        Map<String, Object> results = asMap(body.get("results"));
        Map<String, Object> common = asMap(results.get("common"));
        String errorCode = text(common.get("errorCode"));
        String errorMessage = text(common.get("errorMessage"));
        log.info(
            "JUSO_SEARCH response code={} message='{}' totalCount={}",
            errorCode,
            printable(errorMessage),
            text(common.get("totalCount"))
        );
        if (!"0".equals(errorCode)) {
            throw new IllegalStateException(errorMessage == null ? "address search failed" : errorMessage);
        }

        List<Map<String, Object>> items = new ArrayList<Map<String, Object>>();
        for (Object row : asList(results.get("juso"))) {
            Map<String, Object> address = asMap(row);
            if (address.isEmpty()) {
                continue;
            }
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("road_address", text(address.get("roadAddr")));
            item.put("road_address_part1", text(address.get("roadAddrPart1")));
            item.put("road_address_part2", text(address.get("roadAddrPart2")));
            item.put("jibun_address", text(address.get("jibunAddr")));
            item.put("zip_no", text(address.get("zipNo")));
            item.put("building_name", text(address.get("bdNm")));
            item.put("si_nm", text(address.get("siNm")));
            item.put("sgg_nm", text(address.get("sggNm")));
            item.put("emd_nm", text(address.get("emdNm")));
            items.add(item);
        }

        Map<String, Object> response = new LinkedHashMap<String, Object>();
        response.put("keyword", normalizedKeyword);
        response.put("current_page", number(common.get("currentPage"), currentPage));
        response.put("count_per_page", number(common.get("countPerPage"), countPerPage));
        response.put("total_count", number(common.get("totalCount"), items.size()));
        response.put("items", items);
        return response;
    }

    private Map<String, Object> exchange(String uri) {
        BufferedReader reader = null;
        try {
            URL url = new URL(uri);
            reader = new BufferedReader(new InputStreamReader(url.openStream(), StandardCharsets.UTF_8));
            StringBuilder body = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                body.append(line);
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> response = OBJECT_MAPPER.readValue(body.toString(), Map.class);
            return response == null ? Collections.<String, Object>emptyMap() : response;
        } catch (Exception exception) {
            throw new IllegalStateException("address search request failed", exception);
        } finally {
            if (reader != null) {
                try {
                    reader.close();
                } catch (Exception ignored) {
                }
            }
        }
    }

    private Map<String, Object> asMap(Object value) {
        if (!(value instanceof Map)) {
            return Collections.emptyMap();
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> map = (Map<String, Object>) value;
        return map;
    }

    private List<?> asList(Object value) {
        return value instanceof List ? (List<?>) value : Collections.emptyList();
    }

    private String text(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private String sanitizeKeyword(String keyword) {
        if (keyword == null) {
            return "";
        }
        String normalized = keyword
            .replace('\u00A0', ' ')
            .replaceAll("[\\u200B-\\u200D\\uFEFF]", "")
            .replaceAll("\\s+", " ")
            .trim();
        return normalized.replaceAll("[^0-9A-Za-z가-힣\\s()\\-.,]", "");
    }

    private String printable(String value) {
        if (value == null) {
            return "";
        }
        return value
            .replace("\\", "\\\\")
            .replace("\r", "\\r")
            .replace("\n", "\\n")
            .replace("\t", "\\t");
    }

    private String keySuffix() {
        if (confirmationKey.length() <= 6) {
            return confirmationKey;
        }
        return confirmationKey.substring(confirmationKey.length() - 6);
    }

    private int number(Object value, int fallback) {
        if (value == null) {
            return fallback;
        }
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (NumberFormatException exception) {
            return fallback;
        }
    }
}
