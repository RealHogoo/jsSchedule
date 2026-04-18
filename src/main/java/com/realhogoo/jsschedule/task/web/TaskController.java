package com.realhogoo.jsschedule.task.web;

import com.realhogoo.jsschedule.api.ApiResponse;
import com.realhogoo.jsschedule.task.service.TaskService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping("/task/list.json")
    public ApiResponse<Object> list(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(taskService.getTaskList(body, viewerUserId(request), viewerRoles(request)), request);
    }

    @PostMapping("/task/detail.json")
    public ApiResponse<Object> detail(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(taskService.getTaskDetail(body, viewerUserId(request), viewerRoles(request)), request);
    }

    @PostMapping("/task/save.json")
    public ApiResponse<Object> save(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(taskService.saveTask(body, viewerUserId(request), viewerRoles(request)), request);
    }

    @PostMapping("/task/blog-route.json")
    public ApiResponse<Object> blogRoute(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(taskService.getBlogRouteInfo(body, viewerUserId(request), viewerRoles(request)), request);
    }

    @SuppressWarnings("unchecked")
    private List<String> viewerRoles(HttpServletRequest request) {
        Object rolesAttr = request.getAttribute("roles");
        return rolesAttr instanceof List ? (List<String>) rolesAttr : Collections.<String>emptyList();
    }

    private String viewerUserId(HttpServletRequest request) {
        return request.getAttribute("user_id") == null ? "" : String.valueOf(request.getAttribute("user_id"));
    }
}
