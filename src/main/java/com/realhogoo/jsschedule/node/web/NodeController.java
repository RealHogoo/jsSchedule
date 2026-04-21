package com.realhogoo.jsschedule.node.web;

import com.realhogoo.jsschedule.api.ApiResponse;
import com.realhogoo.jsschedule.auth.AuthRequestSupport;
import com.realhogoo.jsschedule.auth.ServicePermissionSupport;
import com.realhogoo.jsschedule.node.service.NodeService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.Map;

@RestController
public class NodeController {

    private final NodeService nodeService;

    public NodeController(NodeService nodeService) {
        this.nodeService = nodeService;
    }

    @PostMapping("/node/tree.json")
    public ApiResponse<Object> tree(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(nodeService.getNodeTree(body, AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerRoles(request)), request);
    }

    @PostMapping("/node/detail.json")
    public ApiResponse<Object> detail(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(nodeService.getNodeDetail(body, AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerRoles(request)), request);
    }

    @PostMapping("/node/save.json")
    public ApiResponse<Object> save(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        ServicePermissionSupport.ensurePermission(request, ServicePermissionSupport.WRITE);
        return ApiResponse.ok(nodeService.saveNode(body, AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerRoles(request)), request);
    }

    @PostMapping("/node/move.json")
    public ApiResponse<Object> move(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        ServicePermissionSupport.ensurePermission(request, ServicePermissionSupport.WRITE);
        return ApiResponse.ok(nodeService.moveNode(body, AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerRoles(request)), request);
    }

    @PostMapping("/node/delete.json")
    public ApiResponse<Object> delete(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        ServicePermissionSupport.ensurePermission(request, ServicePermissionSupport.DELETE);
        return ApiResponse.ok(nodeService.deleteNode(body, AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerRoles(request)), request);
    }

    @PostMapping("/task-type/list.json")
    public ApiResponse<Object> taskTypeList(HttpServletRequest request) {
        return ApiResponse.ok(nodeService.getTaskTypeList(), request);
    }

    @PostMapping("/task-type/metric/list.json")
    public ApiResponse<Object> taskTypeMetricList(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(nodeService.getTaskTypeMetricList(body), request);
    }

    @PostMapping("/task-type/metric/save.json")
    public ApiResponse<Object> saveTaskTypeMetrics(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        ServicePermissionSupport.ensurePermission(request, ServicePermissionSupport.WRITE);
        return ApiResponse.ok(nodeService.saveTaskTypeMetrics(body, AuthRequestSupport.viewerUserId(request), AuthRequestSupport.viewerRoles(request)), request);
    }
}
