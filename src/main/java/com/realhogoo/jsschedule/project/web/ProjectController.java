package com.realhogoo.jsschedule.project.web;

import com.realhogoo.jsschedule.api.ApiResponse;
import com.realhogoo.jsschedule.project.service.ProjectService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.Map;

@RestController
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping("/project/list.json")
    public ApiResponse<Object> list(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(projectService.getProjectList(body), request);
    }
}
