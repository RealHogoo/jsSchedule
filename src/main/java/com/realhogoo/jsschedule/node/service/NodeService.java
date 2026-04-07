package com.realhogoo.jsschedule.node.service;

import java.util.List;
import java.util.Map;

public interface NodeService {
    Map<String, Object> getNodeTree(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    Map<String, Object> getNodeDetail(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    Map<String, Object> saveNode(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    Map<String, Object> moveNode(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    Map<String, Object> deleteNode(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    List<Map<String, Object>> getTaskTypeList();
    List<Map<String, Object>> getTaskTypeMetricList(Map<String, Object> params);
    Map<String, Object> saveTaskTypeMetrics(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
}
