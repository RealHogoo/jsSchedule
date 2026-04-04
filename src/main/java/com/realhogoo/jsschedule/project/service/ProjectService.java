package com.realhogoo.jsschedule.project.service;

import java.util.List;
import java.util.Map;

public interface ProjectService {
    List<Map<String, Object>> getProjectList(Map<String, Object> params);
}
