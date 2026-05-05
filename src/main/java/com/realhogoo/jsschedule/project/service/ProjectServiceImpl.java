package com.realhogoo.jsschedule.project.service;

import com.realhogoo.jsschedule.api.ApiCode;
import com.realhogoo.jsschedule.api.ApiException;
import com.realhogoo.jsschedule.auth.RoleSupport;
import com.realhogoo.jsschedule.integration.admin.AdminServiceClient;
import com.realhogoo.jsschedule.project.mapper.ProjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ProjectServiceImpl implements ProjectService {
    private static final Set<String> ALLOWED_PROJECT_TYPES = new HashSet<String>(
        Arrays.asList("GENERAL", "DEVELOPMENT", "BLOG")
    );
    private static final Set<String> ALLOWED_STATUSES = new HashSet<String>(
        Arrays.asList("PLANNING", "READY", "IN_PROGRESS", "DONE", "HOLD")
    );

    private final ProjectMapper projectMapper;
    private final AdminServiceClient adminServiceClient;

    public ProjectServiceImpl(ProjectMapper projectMapper, AdminServiceClient adminServiceClient) {
        this.projectMapper = projectMapper;
        this.adminServiceClient = adminServiceClient;
    }

    @Override
    public List<Map<String, Object>> getProjectList(Map<String, Object> params, String viewerUserId, List<String> viewerRoles) {
        Map<String, Object> query = new LinkedHashMap<String, Object>(params == null ? Collections.<String, Object>emptyMap() : params);
        query.put("viewer_user_id", viewerUserId);
        query.put("viewer_is_admin", RoleSupport.isAdmin(viewerRoles));
        return projectMapper.selectProjectList(query);
    }

    @Override
    public Map<String, Object> getProjectDetail(Map<String, Object> params, String viewerUserId, List<String> viewerRoles) {
        Map<String, Object> request = params == null ? Collections.<String, Object>emptyMap() : params;
        Long projectId = asLong(request.get("project_id"));
        if (projectId == null) {
            throw ApiException.badRequest("project_id is required");
        }

        Map<String, Object> query = new LinkedHashMap<String, Object>();
        query.put("project_id", projectId);
        query.put("viewer_user_id", viewerUserId);
        query.put("viewer_is_admin", RoleSupport.isAdmin(viewerRoles));
        Map<String, Object> detail = projectMapper.selectProjectDetail(query);
        if (detail == null || detail.isEmpty()) {
            throw new ApiException(ApiCode.NOT_FOUND, HttpStatus.NOT_FOUND, "project not found");
        }
        return detail;
    }

    @Override
    @Transactional
    public Map<String, Object> saveProject(Map<String, Object> params) {
        if (params == null) {
            throw ApiException.badRequest("request body is required");
        }

        Long projectId = asLong(params.get("project_id"));
        String projectKey = requiredText(params.get("project_key"), "project_key is required");
        String projectName = requiredText(params.get("project_name"), "project_name is required");
        String ownerUserId = requiredText(params.get("owner_user_id"), "owner_user_id is required");
        String projectTypeCode = normalizeProjectType(params.get("project_type_code"));
        String projectStatus = normalizeStatus(params.get("project_status"));
        String originAddress = optionalText(params.get("origin_address"));
        String description = optionalText(params.get("description"));
        String startDate = optionalDate(params.get("start_date"), "start_date");
        String endDate = optionalDate(params.get("end_date"), "end_date");

        validateDateRange(startDate, endDate);

        Map<String, Object> payload = new java.util.LinkedHashMap<String, Object>();
        payload.put("project_id", projectId);
        payload.put("project_key", projectKey);
        payload.put("project_name", projectName);
        payload.put("project_type_code", projectTypeCode);
        payload.put("project_status", projectStatus);
        payload.put("owner_user_id", ownerUserId);
        payload.put("origin_address", originAddress);
        payload.put("start_date", startDate);
        payload.put("end_date", endDate);
        payload.put("description", description);

        if (projectMapper.countProjectKey(payload) > 0) {
            throw new ApiException(ApiCode.BIZ_ERROR, HttpStatus.CONFLICT, "project_key already exists");
        }

        if (projectId == null) {
            projectMapper.insertProject(payload);
            projectId = asLong(payload.get("project_id"));
        } else {
            if (projectMapper.countProjectById(Collections.<String, Object>singletonMap("project_id", projectId)) == 0) {
                throw new ApiException(ApiCode.NOT_FOUND, HttpStatus.NOT_FOUND, "project not found");
            }
            projectMapper.updateProject(payload);
        }
        payload.put("project_id", projectId);
        projectMapper.upsertProjectOwner(payload);

        return getProjectDetail(Collections.<String, Object>singletonMap("project_id", projectId), ownerUserId, Collections.singletonList("ROLE_ADMIN"));
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getProjectManagerOptions(Map<String, Object> params, String accessToken) {
        Map<String, Object> request = new LinkedHashMap<String, Object>();
        if (params != null) {
            Object keyword = params.get("keyword");
            if (keyword != null) {
                request.put("keyword", String.valueOf(keyword).trim());
            }
        }

        Map<String, Object> response = adminServiceClient.userOptions(request, accessToken);
        if (response == null || !Boolean.TRUE.equals(response.get("ok"))) {
            throw new ApiException(ApiCode.SERVER_ERROR, HttpStatus.BAD_GATEWAY, "failed to load manager options");
        }

        Object data = response.get("data");
        if (data instanceof List) {
            return (List<Map<String, Object>>) data;
        }
        return Collections.emptyList();
    }

    @Override
    public List<Map<String, Object>> getProjectMemberList(Map<String, Object> params, String viewerUserId, List<String> viewerRoles) {
        Map<String, Object> query = memberQuery(params, viewerUserId, viewerRoles);
        return projectMapper.selectProjectMemberList(query);
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getProjectMemberCandidateOptions(
        Map<String, Object> params,
        String accessToken,
        String viewerUserId,
        List<String> viewerRoles
    ) {
        Map<String, Object> query = memberQuery(params, viewerUserId, viewerRoles);
        Map<String, Object> request = new LinkedHashMap<String, Object>();
        request.put("keyword", optionalText(params == null ? null : params.get("keyword")));

        Map<String, Object> response = adminServiceClient.userOptions(request, accessToken);
        if (response == null || !Boolean.TRUE.equals(response.get("ok"))) {
            throw new ApiException(ApiCode.SERVER_ERROR, HttpStatus.BAD_GATEWAY, "failed to load member candidates");
        }

        Object data = response.get("data");
        if (!(data instanceof List)) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> existingMembers = projectMapper.selectProjectMemberList(query);
        Set<String> existingUserIds = new HashSet<String>();
        for (Map<String, Object> member : existingMembers) {
            String userId = optionalText(member.get("user_id"));
            if (userId != null) {
                existingUserIds.add(userId);
            }
        }

        List<Map<String, Object>> candidates = new java.util.ArrayList<Map<String, Object>>();
        for (Map<String, Object> user : (List<Map<String, Object>>) data) {
            String userId = optionalText(user.get("user_id"));
            if (userId == null || existingUserIds.contains(userId)) {
                continue;
            }
            candidates.add(user);
        }
        return candidates;
    }

    @Override
    @Transactional
    public Map<String, Object> addProjectMember(Map<String, Object> params, String accessToken) {
        if (params == null) {
            throw ApiException.badRequest("request body is required");
        }
        Long projectId = asLong(params.get("project_id"));
        if (projectId == null) {
            throw ApiException.badRequest("project_id is required");
        }
        if (projectMapper.countProjectById(Collections.<String, Object>singletonMap("project_id", projectId)) == 0) {
            throw new ApiException(ApiCode.NOT_FOUND, HttpStatus.NOT_FOUND, "project not found");
        }

        String userId = requiredText(params.get("user_id"), "user_id is required");
        Map<String, Object> verifiedUser = findActiveAdminUser(userId, accessToken);
        Map<String, Object> payload = new LinkedHashMap<String, Object>();
        payload.put("project_id", projectId);
        payload.put("user_id", userId);
        payload.put("user_nm", optionalText(verifiedUser.get("user_nm")));
        payload.put("project_role", "MEMBER");
        projectMapper.insertProjectMember(payload);

        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("project_id", projectId);
        result.put("user_id", userId);
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> findActiveAdminUser(String userId, String accessToken) {
        Map<String, Object> request = new LinkedHashMap<String, Object>();
        request.put("keyword", userId);

        Map<String, Object> response = adminServiceClient.userOptions(request, accessToken);
        if (response == null || !Boolean.TRUE.equals(response.get("ok"))) {
            throw new ApiException(ApiCode.SERVER_ERROR, HttpStatus.BAD_GATEWAY, "failed to verify project member");
        }

        Object data = response.get("data");
        if (data instanceof List) {
            for (Map<String, Object> user : (List<Map<String, Object>>) data) {
                String candidateUserId = optionalText(user.get("user_id"));
                if (userId.equals(candidateUserId)) {
                    return user;
                }
            }
        }
        throw ApiException.badRequest("user_id must be an active admin user");
    }

    @Override
    @Transactional
    public Map<String, Object> deleteProjectMember(Map<String, Object> params) {
        if (params == null) {
            throw ApiException.badRequest("request body is required");
        }
        Long projectId = asLong(params.get("project_id"));
        if (projectId == null) {
            throw ApiException.badRequest("project_id is required");
        }
        String userId = requiredText(params.get("user_id"), "user_id is required");

        Map<String, Object> payload = new LinkedHashMap<String, Object>();
        payload.put("project_id", projectId);
        payload.put("user_id", userId);
        int deleted = projectMapper.deleteProjectMember(payload);

        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("project_id", projectId);
        result.put("user_id", userId);
        result.put("deleted", deleted);
        return result;
    }

    private Map<String, Object> memberQuery(Map<String, Object> params, String viewerUserId, List<String> viewerRoles) {
        Map<String, Object> request = params == null ? Collections.<String, Object>emptyMap() : params;
        Long projectId = asLong(request.get("project_id"));
        if (projectId == null) {
            throw ApiException.badRequest("project_id is required");
        }

        Map<String, Object> query = new LinkedHashMap<String, Object>();
        query.put("project_id", projectId);
        query.put("keyword", optionalText(request.get("keyword")));
        query.put("viewer_user_id", viewerUserId);
        query.put("viewer_is_admin", RoleSupport.isAdmin(viewerRoles));
        return query;
    }

    private String requiredText(Object value, String message) {
        String text = optionalText(value);
        if (text == null || text.isEmpty()) {
            throw ApiException.badRequest(message);
        }
        return text;
    }

    private String optionalText(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private String normalizeStatus(Object value) {
        String status = optionalText(value);
        if (status == null) {
            return "PLANNING";
        }
        status = status.toUpperCase();
        if (!ALLOWED_STATUSES.contains(status)) {
            throw ApiException.badRequest("invalid project_status");
        }
        return status;
    }

    private String normalizeProjectType(Object value) {
        String projectType = optionalText(value);
        if (projectType == null) {
            return "GENERAL";
        }
        projectType = projectType.toUpperCase();
        if (!ALLOWED_PROJECT_TYPES.contains(projectType)) {
            throw ApiException.badRequest("invalid project_type_code");
        }
        return projectType;
    }

    private String optionalDate(Object value, String fieldName) {
        String text = optionalText(value);
        if (text == null) {
            return null;
        }
        try {
            return LocalDate.parse(text).toString();
        } catch (DateTimeParseException exception) {
            throw ApiException.badRequest(fieldName + " must be yyyy-MM-dd");
        }
    }

    private void validateDateRange(String startDate, String endDate) {
        if (startDate == null || endDate == null) {
            return;
        }
        if (LocalDate.parse(startDate).isAfter(LocalDate.parse(endDate))) {
            throw ApiException.badRequest("start_date must be before or equal to end_date");
        }
    }

    private Long asLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return Long.valueOf(text);
        } catch (NumberFormatException exception) {
            throw ApiException.badRequest("project_id must be numeric");
        }
    }
}
