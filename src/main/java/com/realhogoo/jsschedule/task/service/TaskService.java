package com.realhogoo.jsschedule.task.service;

import java.util.List;
import java.util.Map;

public interface TaskService {
    List<Map<String, Object>> getTaskList(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    Map<String, Object> getTaskDetail(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    Map<String, Object> saveTask(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    Map<String, Object> getBlogRouteInfo(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
}
