package com.realhogoo.jsschedule.dashboard.service;

import java.util.Map;

public interface DashboardService {
    Map<String, Object> getSummary(Map<String, Object> params, String accessToken);
}
