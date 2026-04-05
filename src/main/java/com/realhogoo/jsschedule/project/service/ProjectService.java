package com.realhogoo.jsschedule.project.service;

import java.util.List;
import java.util.Map;

public interface ProjectService {
    List<Map<String, Object>> getProjectList(Map<String, Object> params);
    Map<String, Object> getProjectDetail(Map<String, Object> params);
    Map<String, Object> saveProject(Map<String, Object> params);
    List<Map<String, Object>> getProjectManagerOptions(Map<String, Object> params, String accessToken);
}
