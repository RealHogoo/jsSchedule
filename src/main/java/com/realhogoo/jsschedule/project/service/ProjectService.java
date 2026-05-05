package com.realhogoo.jsschedule.project.service;

import java.util.List;
import java.util.Map;

public interface ProjectService {
    List<Map<String, Object>> getProjectList(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    Map<String, Object> getProjectDetail(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    Map<String, Object> saveProject(Map<String, Object> params);
    List<Map<String, Object>> getProjectManagerOptions(Map<String, Object> params, String accessToken);
    List<Map<String, Object>> getProjectMemberList(Map<String, Object> params, String viewerUserId, List<String> viewerRoles);
    List<Map<String, Object>> getProjectMemberCandidateOptions(Map<String, Object> params, String accessToken, String viewerUserId, List<String> viewerRoles);
    Map<String, Object> addProjectMember(Map<String, Object> params, String accessToken);
    Map<String, Object> deleteProjectMember(Map<String, Object> params);
}
