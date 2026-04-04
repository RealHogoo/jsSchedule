package com.realhogoo.jsschedule.task.web;

import com.realhogoo.jsschedule.api.ApiResponse;
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
        return ApiResponse.ok(taskService.getTaskList(body), request);
    }
}
