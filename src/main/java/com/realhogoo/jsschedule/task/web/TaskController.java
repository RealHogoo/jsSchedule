package com.realhogoo.jsschedule.task.web;

import com.realhogoo.jsschedule.api.ApiResponse;
import com.realhogoo.jsschedule.auth.AuthRequestSupport;
import com.realhogoo.jsschedule.auth.ServicePermissionSupport;
import com.realhogoo.jsschedule.task.service.TaskService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.Map;

@RestController
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping("/task/list.json")
    public ApiResponse<Object> list(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(taskService.getTaskList(body, AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerRoles(request)), request);
    }

    @PostMapping("/task/detail.json")
    public ApiResponse<Object> detail(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(taskService.getTaskDetail(body, AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerRoles(request)), request);
    }

    @PostMapping("/task/save.json")
    public ApiResponse<Object> save(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        ServicePermissionSupport.ensurePermission(request, ServicePermissionSupport.WRITE);
        return ApiResponse.ok(taskService.saveTask(body, AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerRoles(request)), request);
    }

    @PostMapping("/task/blog-route.json")
    public ApiResponse<Object> blogRoute(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(taskService.getBlogRouteInfo(body, AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerRoles(request)), request);
    }

    @PostMapping("/task/comment/list.json")
    public ApiResponse<Object> commentList(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(taskService.getTaskCommentList(body, AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerRoles(request)), request);
    }

    @PostMapping("/task/comment/save.json")
    public ApiResponse<Object> saveComment(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(taskService.saveTaskComment(body, AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerRoles(request)), request);
    }

    @PostMapping("/task/comment/delete.json")
    public ApiResponse<Object> deleteComment(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(taskService.deleteTaskComment(body, AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerRoles(request)), request);
    }
}
