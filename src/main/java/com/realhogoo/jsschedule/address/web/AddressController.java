package com.realhogoo.jsschedule.address.web;

import com.realhogoo.jsschedule.api.ApiResponse;
import com.realhogoo.jsschedule.integration.juso.JusoAddressClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class AddressController {

    private final JusoAddressClient jusoAddressClient;

    public AddressController(JusoAddressClient jusoAddressClient) {
        this.jusoAddressClient = jusoAddressClient;
    }

    @PostMapping("/address/config.json")
    public ApiResponse<Object> config(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("enabled", jusoAddressClient.isConfigured());
        data.put("message", jusoAddressClient.isConfigured() ? "" : "juso confirmation key is not configured");
        return ApiResponse.ok(data, request);
    }

    @PostMapping("/address/search.json")
    public ApiResponse<Object> search(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> params = body == null ? new LinkedHashMap<String, Object>() : new LinkedHashMap<String, Object>(body);
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        String keyword = text(params.get("keyword"));
        int currentPage = number(params.get("current_page"), 1);
        int countPerPage = number(params.get("count_per_page"), 8);

        data.put("available", false);
        data.put("message", "");
        data.put("items", java.util.Collections.emptyList());
        data.put("keyword", keyword);

        if (!jusoAddressClient.isConfigured()) {
            data.put("message", "juso confirmation key is not configured");
            return ApiResponse.ok(data, request);
        }
        if (keyword == null) {
            data.put("message", "keyword is required");
            return ApiResponse.ok(data, request);
        }

        try {
            data.putAll(jusoAddressClient.search(keyword, currentPage, countPerPage));
            data.put("available", true);
        } catch (RuntimeException exception) {
            data.put("message", exception.getMessage() == null ? "address search failed" : exception.getMessage());
        }
        return ApiResponse.ok(data, request);
    }

    private String text(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
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
