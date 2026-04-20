package com.realhogoo.jsschedule.dashboard.service;

import com.realhogoo.jsschedule.auth.RoleSupport;
import com.realhogoo.jsschedule.dashboard.mapper.DashboardMapper;
import com.realhogoo.jsschedule.integration.admin.AdminServiceClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardServiceImpl implements DashboardService {
    private static final Logger log = LoggerFactory.getLogger(DashboardServiceImpl.class);

    private final DashboardMapper dashboardMapper;
    private final AdminServiceClient adminServiceClient;

    public DashboardServiceImpl(DashboardMapper dashboardMapper, AdminServiceClient adminServiceClient) {
        this.dashboardMapper = dashboardMapper;
        this.adminServiceClient = adminServiceClient;
    }

    @Override
    public Map<String, Object> getSummary(Map<String, Object> params, String accessToken, String viewerUserId, List<String> viewerRoles) {
        log.info("JOB_START dashboard.summary");
        try {
            Map<String, Object> query = accessParams(params, viewerUserId, viewerRoles);
            Map<String, Object> summary = dashboardMapper.selectSummary(query);
            Map<String, Object> response = new LinkedHashMap<String, Object>();
            response.put("summary", summary);
            response.put("current_user", adminServiceClient.fetchCurrentUser(accessToken));
            log.info("JOB_END dashboard.summary");
            return response;
        } catch (RuntimeException exception) {
            log.error("JOB_FAIL dashboard.summary", exception);
            throw exception;
        }
    }

    @Override
    public Map<String, Object> getDetail(Map<String, Object> params, String accessToken, String viewerUserId, List<String> viewerRoles) {
        log.info("JOB_START dashboard.detail");
        try {
            Map<String, Object> safeParams = accessParams(params, viewerUserId, viewerRoles);
            Map<String, Object> response = new LinkedHashMap<String, Object>();
            response.put("summary", dashboardMapper.selectSummary(safeParams));
            response.put("project_stats", dashboardMapper.selectProjectStats(safeParams));
            response.put("monthly_stats", dashboardMapper.selectMonthlyStats(safeParams));
            response.put("current_user", adminServiceClient.fetchCurrentUser(accessToken));
            log.info("JOB_END dashboard.detail");
            return response;
        } catch (RuntimeException exception) {
            log.error("JOB_FAIL dashboard.detail", exception);
            throw exception;
        }
    }

    private Map<String, Object> accessParams(Map<String, Object> params, String viewerUserId, List<String> viewerRoles) {
        Map<String, Object> query = new LinkedHashMap<String, Object>(params == null ? Collections.<String, Object>emptyMap() : params);
        query.put("viewer_user_id", viewerUserId);
        query.put("viewer_is_admin", RoleSupport.isAdmin(viewerRoles));
        return query;
    }
}
