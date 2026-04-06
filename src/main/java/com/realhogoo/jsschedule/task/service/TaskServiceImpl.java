package com.realhogoo.jsschedule.task.service;

import com.realhogoo.jsschedule.api.ApiCode;
import com.realhogoo.jsschedule.api.ApiException;
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
    private static final Set<String> ALLOWED_STATUSES = new HashSet<String>(
        Arrays.asList("TODO", "IN_PROGRESS", "DONE", "HOLD")
    );
    private static final Set<String> ALLOWED_PRIORITIES = new HashSet<String>(
        Arrays.asList("HIGH", "MEDIUM", "LOW")
    );

    private final TaskMapper taskMapper;

    public TaskServiceImpl(TaskMapper taskMapper) {
        this.taskMapper = taskMapper;
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
        if (projectId == null) {
            throw ApiException.badRequest("project_id is required");
        }

        String taskTitle = requiredText(params.get("task_title"), "task_title is required");
        String taskStatus = normalizeEnum(params.get("task_status"), "TODO", ALLOWED_STATUSES, "invalid task_status");
        String priority = normalizeEnum(params.get("priority"), "MEDIUM", ALLOWED_PRIORITIES, "invalid priority");
        String assigneeUserId = optionalText(params.get("assignee_user_id"));
        String startDate = optionalDate(params.get("start_date"), "start_date");
        String dueDate = optionalDate(params.get("due_date"), "due_date");
        String description = optionalText(params.get("description"));
        Integer progressRate = normalizeProgress(params.get("progress_rate"));

        validateDateRange(startDate, dueDate);

        Map<String, Object> payload = new LinkedHashMap<String, Object>();
        payload.put("task_id", taskId);
        payload.put("project_id", projectId);
        payload.put("task_title", taskTitle);
        payload.put("task_status", taskStatus);
        payload.put("priority", priority);
        payload.put("assignee_user_id", assigneeUserId);
        payload.put("start_date", startDate);
        payload.put("due_date", dueDate);
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
