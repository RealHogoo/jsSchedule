package com.realhogoo.jsschedule.task.service;

import com.realhogoo.jsschedule.api.ApiCode;
import com.realhogoo.jsschedule.api.ApiException;
import com.realhogoo.jsschedule.integration.kakao.KakaoMapClient;
import com.realhogoo.jsschedule.task.mapper.TaskMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class TaskServiceImpl implements TaskService {
    private static final int MAX_TASK_DEPTH = 3;
    private static final Set<String> ALLOWED_TASK_TYPES = new HashSet<String>(
        Arrays.asList("GENERAL", "DEVELOPMENT", "BLOG")
    );
    private static final Set<String> ALLOWED_STATUSES = new HashSet<String>(
        Arrays.asList("TODO", "IN_PROGRESS", "DONE", "HOLD")
    );
    private static final Set<String> ALLOWED_PRIORITIES = new HashSet<String>(
        Arrays.asList("HIGH", "MEDIUM", "LOW")
    );

    private final TaskMapper taskMapper;
    private final KakaoMapClient kakaoMapClient;

    public TaskServiceImpl(TaskMapper taskMapper, KakaoMapClient kakaoMapClient) {
        this.taskMapper = taskMapper;
        this.kakaoMapClient = kakaoMapClient;
    }

    @Override
    public List<Map<String, Object>> getTaskList(Map<String, Object> params, String viewerUserId, List<String> viewerRoles) {
        Map<String, Object> query = new LinkedHashMap<String, Object>(params == null ? Collections.<String, Object>emptyMap() : params);
        query.put("project_id", asLong(query.get("project_id"), "project_id"));
        query.put("viewer_user_id", viewerUserId);
        query.put("viewer_is_admin", isAdmin(viewerRoles));
        return taskMapper.selectTaskList(query);
    }

    @Override
    public Map<String, Object> getTaskDetail(Map<String, Object> params, String viewerUserId, List<String> viewerRoles) {
        Map<String, Object> query = new LinkedHashMap<String, Object>(params == null ? Collections.<String, Object>emptyMap() : params);
        Long taskId = asLong(query.get("task_id"), "task_id");
        if (taskId == null) {
            throw ApiException.badRequest("task_id is required");
        }
        query.put("task_id", taskId);
        query.put("viewer_user_id", viewerUserId);
        query.put("viewer_is_admin", isAdmin(viewerRoles));

        Map<String, Object> detail = taskMapper.selectTaskDetail(query);
        if (detail == null || detail.isEmpty()) {
            throw new ApiException(ApiCode.NOT_FOUND, HttpStatus.NOT_FOUND, "task not found");
        }
        return detail;
    }

    @Override
    @Transactional
    public Map<String, Object> saveTask(Map<String, Object> params, String viewerUserId, List<String> viewerRoles) {
        if (params == null) {
            throw ApiException.badRequest("request body is required");
        }

        Long taskId = asLong(params.get("task_id"), "task_id");
        Long projectId = asLong(params.get("project_id"), "project_id");
        Long parentTaskId = asLong(params.get("parent_task_id"), "parent_task_id");
        if (projectId == null) {
            throw ApiException.badRequest("project_id is required");
        }

        String taskTitle = requiredText(params.get("task_title"), "task_title is required");
        String taskStatus = normalizeEnum(params.get("task_status"), "TODO", ALLOWED_STATUSES, "invalid task_status");
        String priority = normalizeEnum(params.get("priority"), "MEDIUM", ALLOWED_PRIORITIES, "invalid priority");
        String assigneeUserId = optionalText(params.get("assignee_user_id"));
        Map<String, Object> project = taskMapper.selectProjectReference(Collections.<String, Object>singletonMap("project_id", projectId));
        if (project == null || project.isEmpty()) {
            throw new ApiException(ApiCode.NOT_FOUND, HttpStatus.NOT_FOUND, "project not found");
        }
        String taskTypeCode = normalizeTaskType(project.get("project_type_code"));
        String startDate = optionalDate(params.get("start_date"), "start_date");
        String dueDate = optionalDate(params.get("due_date"), "due_date");
        String actualStartDate = optionalDate(params.get("actual_start_date"), "actual_start_date");
        String actualEndDate = optionalDate(params.get("actual_end_date"), "actual_end_date");
        String taskUrl = optionalText(params.get("task_url"));
        java.math.BigDecimal supportAmount = optionalDecimal(params.get("support_amount"), "support_amount");
        java.math.BigDecimal actualAmount = optionalDecimal(params.get("actual_amount"), "actual_amount");
        String description = optionalText(params.get("description"));
        Integer progressRate = normalizeProgress(params.get("progress_rate"));

        validateDateRange(startDate, dueDate);
        validateDateRange(actualStartDate, actualEndDate);
        validateTaskFields(taskTypeCode, startDate, dueDate, actualStartDate, actualEndDate, taskUrl, supportAmount, actualAmount);
        validateParentTask(taskId, projectId, parentTaskId);

        Map<String, Object> payload = new LinkedHashMap<String, Object>();
        payload.put("task_id", taskId);
        payload.put("project_id", projectId);
        payload.put("parent_task_id", parentTaskId);
        payload.put("task_type_code", taskTypeCode);
        payload.put("task_title", taskTitle);
        payload.put("task_status", taskStatus);
        payload.put("priority", priority);
        payload.put("assignee_user_id", assigneeUserId);
        payload.put("start_date", startDate);
        payload.put("due_date", dueDate);
        payload.put("actual_start_date", actualStartDate);
        payload.put("actual_end_date", actualEndDate);
        payload.put("task_url", taskUrl);
        payload.put("support_amount", supportAmount);
        payload.put("actual_amount", actualAmount);
        payload.put("progress_rate", progressRate);
        payload.put("description", description);

        if (taskId == null) {
            taskMapper.syncTaskSequence();
            taskMapper.insertTask(payload);
            taskId = asLong(payload.get("task_id"), "task_id");
        } else {
            getTaskDetail(Collections.<String, Object>singletonMap("task_id", taskId), viewerUserId, viewerRoles);
            taskMapper.updateTask(payload);
        }

        return getTaskDetail(Collections.<String, Object>singletonMap("task_id", taskId), viewerUserId, viewerRoles);
    }

    @Override
    public Map<String, Object> getBlogRouteInfo(Map<String, Object> params, String viewerUserId, List<String> viewerRoles) {
        Map<String, Object> request = params == null ? Collections.<String, Object>emptyMap() : params;
        Long projectId = asLong(request.get("project_id"), "project_id");
        String destinationAddress = optionalText(request.get("destination_address"));
        Map<String, Object> response = new LinkedHashMap<String, Object>();
        Map<String, Object> project;
        String originAddress;

        response.put("available", false);
        response.put("message", "");

        if (projectId == null) {
            response.put("message", "project_id is required");
            return response;
        }
        if (destinationAddress == null) {
            response.put("message", "destination_address is required");
            return response;
        }

        project = taskMapper.selectProjectReference(Collections.<String, Object>singletonMap("project_id", projectId));
        if (project == null || project.isEmpty()) {
            response.put("message", "project not found");
            return response;
        }

        originAddress = normalizeRouteAddress(optionalText(project.get("origin_address")));
        destinationAddress = normalizeRouteAddress(destinationAddress);
        response.put("origin_address", originAddress);
        response.put("destination_address", destinationAddress);
        if (originAddress == null) {
            response.put("message", "project origin address is required");
            return response;
        }
        if (!kakaoMapClient.isConfigured()) {
            response.put("message", "kakao rest api key is not configured");
            return response;
        }

        try {
            response.putAll(kakaoMapClient.resolveRoute(originAddress, destinationAddress));
            response.put("origin_address", originAddress);
            response.put("destination_address", destinationAddress);
        } catch (RuntimeException exception) {
            response.put("available", false);
            response.put("message", exception.getMessage() == null ? "route lookup failed" : exception.getMessage());
        }
        return response;
    }

    private String normalizeRouteAddress(String address) {
        if (address == null) {
            return null;
        }
        String normalized = address.replaceAll("\\s*\\([^)]*\\)\\s*$", "").trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private void validateTaskFields(
        String taskTypeCode,
        String startDate,
        String dueDate,
        String actualStartDate,
        String actualEndDate,
        String taskUrl,
        java.math.BigDecimal supportAmount,
        java.math.BigDecimal actualAmount
    ) {
        if ("DEVELOPMENT".equals(taskTypeCode)) {
            if (actualStartDate != null && startDate != null && LocalDate.parse(actualStartDate).isBefore(LocalDate.parse(startDate))) {
                throw ApiException.badRequest("actual_start_date must be on or after start_date");
            }
            if (actualEndDate != null && actualStartDate != null && LocalDate.parse(actualEndDate).isBefore(LocalDate.parse(actualStartDate))) {
                throw ApiException.badRequest("actual_end_date must be on or after actual_start_date");
            }
            return;
        }

        if ("BLOG".equals(taskTypeCode)) {
            if (taskUrl != null && taskUrl.length() > 500) {
                throw ApiException.badRequest("task_url is too long");
            }
            if (supportAmount != null && supportAmount.signum() < 0) {
                throw ApiException.badRequest("support_amount must be zero or greater");
            }
            if (actualAmount != null && actualAmount.signum() < 0) {
                throw ApiException.badRequest("actual_amount must be zero or greater");
            }
            return;
        }
    }

    private String normalizeTaskType(Object value) {
        String taskType = optionalText(value);
        if (taskType == null) {
            return "GENERAL";
        }
        taskType = taskType.toUpperCase();
        if (!ALLOWED_TASK_TYPES.contains(taskType)) {
            throw ApiException.badRequest("invalid task_type_code");
        }
        return taskType;
    }

    private void validateParentTask(Long taskId, Long projectId, Long parentTaskId) {
        Map<String, Object> query = new LinkedHashMap<String, Object>();
        query.put("project_id", projectId);
        List<Map<String, Object>> projectTasks = taskMapper.selectProjectTaskReferences(query);
        Map<Long, Map<String, Object>> taskMap = new LinkedHashMap<Long, Map<String, Object>>();
        for (Map<String, Object> task : projectTasks) {
            Long id = asLong(task.get("task_id"), "task_id");
            if (id != null) {
                taskMap.put(id, task);
            }
        }

        int parentDepth = -1;
        if (parentTaskId != null) {
            if (taskId != null && taskId.equals(parentTaskId)) {
                throw ApiException.badRequest("parent_task_id cannot equal task_id");
            }

            Map<String, Object> parentTask = taskMap.get(parentTaskId);
            if (parentTask == null || parentTask.isEmpty()) {
                throw ApiException.badRequest("parent_task_id is invalid");
            }

            parentDepth = resolveTaskDepth(parentTaskId, taskMap, taskId);
        }

        int subtreeHeight = taskId == null ? 0 : resolveSubtreeHeight(taskId, taskMap);
        if (parentDepth + 1 + subtreeHeight > MAX_TASK_DEPTH) {
            throw ApiException.badRequest("task depth must be 4 levels or less");
        }
    }

    private int resolveTaskDepth(Long taskId, Map<Long, Map<String, Object>> taskMap, Long movingTaskId) {
        int depth = 0;
        Long cursor = taskId;
        Set<Long> visited = new HashSet<Long>();

        while (cursor != null) {
            if (!visited.add(cursor)) {
                throw ApiException.badRequest("parent_task_id chain is invalid");
            }
            if (movingTaskId != null && movingTaskId.equals(cursor) && depth > 0) {
                throw ApiException.badRequest("cannot assign descendant as parent_task_id");
            }

            Map<String, Object> current = taskMap.get(cursor);
            if (current == null || current.isEmpty()) {
                throw ApiException.badRequest("parent_task_id chain is invalid");
            }

            Long parentId = asLong(current.get("parent_task_id"), "parent_task_id");
            if (parentId == null) {
                return depth;
            }

            cursor = parentId;
            depth++;
            if (depth > 100) {
                throw ApiException.badRequest("parent_task_id chain is invalid");
            }
        }

        return depth;
    }

    private int resolveSubtreeHeight(Long rootTaskId, Map<Long, Map<String, Object>> taskMap) {
        Map<Long, List<Long>> children = new LinkedHashMap<Long, List<Long>>();
        for (Map<String, Object> task : taskMap.values()) {
            Long id = asLong(task.get("task_id"), "task_id");
            Long parentId = asLong(task.get("parent_task_id"), "parent_task_id");
            if (id == null || parentId == null) {
                continue;
            }
            List<Long> items = children.get(parentId);
            if (items == null) {
                items = new java.util.ArrayList<Long>();
                children.put(parentId, items);
            }
            items.add(id);
        }
        return subtreeHeight(rootTaskId, children, new HashSet<Long>());
    }

    private int subtreeHeight(Long taskId, Map<Long, List<Long>> children, Set<Long> visited) {
        if (taskId == null || !visited.add(taskId)) {
            return 0;
        }
        List<Long> items = children.get(taskId);
        if (items == null || items.isEmpty()) {
            return 0;
        }

        int max = 0;
        for (Long childId : items) {
            max = Math.max(max, 1 + subtreeHeight(childId, children, new HashSet<Long>(visited)));
        }
        return max;
    }

    private boolean isAdmin(List<String> viewerRoles) {
        if (viewerRoles == null || viewerRoles.isEmpty()) {
            return false;
        }
        return viewerRoles.contains("ROLE_ADMIN") || viewerRoles.contains("ROLE_SUPER_ADMIN");
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

    private String normalizeEnum(Object value, String defaultValue, Set<String> allowed, String message) {
        String text = optionalText(value);
        if (text == null) {
            return defaultValue;
        }
        text = text.toUpperCase();
        if (!allowed.contains(text)) {
            throw ApiException.badRequest(message);
        }
        return text;
    }

    private Integer normalizeProgress(Object value) {
        if (value == null || String.valueOf(value).trim().isEmpty()) {
            return Integer.valueOf(0);
        }
        try {
            int progress = (int) Math.round(Double.parseDouble(String.valueOf(value).trim()));
            if (progress < 0 || progress > 100) {
                throw ApiException.badRequest("progress_rate must be between 0 and 100");
            }
            return Integer.valueOf(progress);
        } catch (NumberFormatException exception) {
            throw ApiException.badRequest("progress_rate must be numeric");
        }
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

    private java.math.BigDecimal optionalDecimal(Object value, String fieldName) {
        String text = optionalText(value);
        if (text == null) {
            return null;
        }
        try {
            return new java.math.BigDecimal(text);
        } catch (NumberFormatException exception) {
            throw ApiException.badRequest(fieldName + " must be numeric");
        }
    }

    private void validateDateRange(String startDate, String dueDate) {
        if (startDate == null || dueDate == null) {
            return;
        }
        if (LocalDate.parse(startDate).isAfter(LocalDate.parse(dueDate))) {
            throw ApiException.badRequest("start_date must be before or equal to due_date");
        }
    }

    private Long asLong(Object value, String fieldName) {
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
            throw ApiException.badRequest(fieldName + " must be numeric");
        }
    }
}
