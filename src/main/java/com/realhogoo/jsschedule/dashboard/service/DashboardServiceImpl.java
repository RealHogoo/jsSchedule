package com.realhogoo.jsschedule.dashboard.service;

import com.realhogoo.jsschedule.dashboard.mapper.DashboardMapper;
import com.realhogoo.jsschedule.integration.admin.AdminServiceClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.LinkedHashMap;
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
    public Map<String, Object> getSummary(Map<String, Object> params, String accessToken) {
        log.info("JOB_START dashboard.summary");
        try {
            Map<String, Object> summary = dashboardMapper.selectSummary(params == null ? Collections.<String, Object>emptyMap() : params);
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
}
