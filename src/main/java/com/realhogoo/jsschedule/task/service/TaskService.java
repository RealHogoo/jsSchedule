package com.realhogoo.jsschedule.task.service;

import java.util.List;
import java.util.Map;

public interface TaskService {
    List<Map<String, Object>> getTaskList(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    Map<String, Object> getTaskDetail(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    Map<String, Object> saveTask(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    Map<String, Object> getBlogRouteInfo(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    List<Map<String, Object>> getTaskCommentList(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    Map<String, Object> saveTaskComment(Map<String, Object> params, String viewerUserId, String viewerUserNm, List<String> viewerRoles);
    Map<String, Object> deleteTaskComment(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
}
