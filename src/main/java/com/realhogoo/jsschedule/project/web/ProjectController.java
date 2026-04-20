package com.realhogoo.jsschedule.project.web;

import com.realhogoo.jsschedule.api.ApiResponse;
import com.realhogoo.jsschedule.auth.AuthRequestSupport;
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
        return ApiResponse.ok(projectService.getProjectList(body, AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerRoles(request)), request);
    }

    @PostMapping("/project/detail.json")
    public ApiResponse<Object> detail(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(projectService.getProjectDetail(body, AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerRoles(request)), request);
    }

    @PostMapping("/project/save.json")
    public ApiResponse<Object> save(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(projectService.saveProject(body), request);
    }

    @PostMapping("/project/manager-options.json")
    public ApiResponse<Object> managerOptions(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        String accessToken = request.getAttribute("access_token") == null ? null : String.valueOf(request.getAttribute("access_token"));
        return ApiResponse.ok(projectService.getProjectManagerOptions(body, accessToken), request);
    }
}
