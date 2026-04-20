package com.realhogoo.jsschedule.dashboard.service;

import java.util.List;
import java.util.Map;

public interface DashboardService {
    Map<String, Object> getSummary(Map<String, Object> params, String accessToken, String viewerUserId, List<String> viewerRoles);

    Map<String, Object> getDetail(Map<String, Object> params, String accessToken, String viewerUserId, List<String> viewerRoles);
}
