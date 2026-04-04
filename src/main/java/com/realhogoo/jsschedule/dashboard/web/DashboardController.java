package com.realhogoo.jsschedule.dashboard.web;

import com.realhogoo.jsschedule.api.ApiResponse;
import com.realhogoo.jsschedule.dashboard.service.DashboardService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.Map;

@RestController
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @PostMapping("/dashboard/summary.json")
    public ApiResponse<Object> summary(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        String accessToken = request.getAttribute("access_token") == null ? null : String.valueOf(request.getAttribute("access_token"));
        return ApiResponse.ok(dashboardService.getSummary(body, accessToken), request);
    }
}
