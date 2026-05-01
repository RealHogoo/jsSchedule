package com.realhogoo.jsschedule.node.service;

import com.realhogoo.jsschedule.api.ApiCode;
import com.realhogoo.jsschedule.api.ApiException;
import com.realhogoo.jsschedule.auth.RoleSupport;
import com.realhogoo.jsschedule.node.mapper.NodeMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class NodeServiceImpl implements NodeService {
    private static final Set<String> ALLOWED_INSERT_MODES = new HashSet<String>(
        Arrays.asList("ROOT", "CHILD", "SIBLING")
    );
    private static final int MAX_METRIC_COUNT = 10;

    private final NodeMapper nodeMapper;

    public NodeServiceImpl(NodeMapper nodeMapper) {
        this.nodeMapper = nodeMapper;
    }

    @Override
    public Map<String, Object> getNodeTree(Map<String, Object> params, String viewerUserId, List<String> viewerRoles) {
        Long taskId = asLong(valueOf(params, "task_id"), "task_id");
        if (taskId == null) {
            throw ApiException.badRequest("task_id is required");
        }

        Map<String, Object> task = loadTaskContext(taskId, viewerUserId, viewerRoles);
        List<Map<String, Object>> rows = nodeMapper.selectNodeTreeRows(accessParams(taskId, viewerUserId, viewerRoles));
        List<Map<String, Object>> metricRows = nodeMapper.selectNodeMetricRows(accessParams(taskId, viewerUserId, viewerRoles));
        Map<Long, Map<String, Object>> indexed = new LinkedHashMap<Long, Map<String, Object>>();
        List<Map<String, Object>> roots = new ArrayList<Map<String, Object>>();

        for (Map<String, Object> row : rows) {
            Map<String, Object> node = new LinkedHashMap<String, Object>(row);
            node.put("children", new ArrayList<Map<String, Object>>());
            node.put("metrics", new ArrayList<Map<String, Object>>());
            indexed.put(asLong(node.get("node_id"), "node_id"), node);
        }

        for (Map<String, Object> metricRow : metricRows) {
            Long nodeId = asLong(metricRow.get("node_id"), "node_id");
            Map<String, Object> node = indexed.get(nodeId);
            if (node == null) {
                continue;
            }
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> metrics = (List<Map<String, Object>>) node.get("metrics");
            metrics.add(new LinkedHashMap<String, Object>(metricRow));
        }

        for (Map<String, Object> node : indexed.values()) {
            Long parentNodeId = asLong(node.get("parent_node_id"), "parent_node_id");
            if (parentNodeId == null) {
                roots.add(node);
                continue;
            }
            Map<String, Object> parent = indexed.get(parentNodeId);
            if (parent == null) {
                roots.add(node);
                continue;
            }
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> children = (List<Map<String, Object>>) parent.get("children");
            children.add(node);
        }

        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("task", task);
        result.put("nodes", roots);
        return result;
    }

    @Override
    public Map<String, Object> getNodeDetail(Map<String, Object> params, String viewerUserId, List<String> viewerRoles) {
        Long nodeId = asLong(valueOf(params, "node_id"), "node_id");
        if (nodeId == null) {
            throw ApiException.badRequest("node_id is required");
        }

        Map<String, Object> detail = nodeMapper.selectNodeDetail(accessParamsByNode(nodeId, viewerUserId, viewerRoles));
        if (detail == null || detail.isEmpty()) {
            throw new ApiException(ApiCode.NOT_FOUND, HttpStatus.NOT_FOUND, "node not found");
        }
        detail.put("metrics", nodeMapper.selectNodeMetrics(nodeId));
        return detail;
    }

    @Override
    @Transactional
    public Map<String, Object> saveNode(Map<String, Object> params, String viewerUserId, List<String> viewerRoles) {
        if (params == null) {
            throw ApiException.badRequest("request body is required");
        }

        Long nodeId = asLong(params.get("node_id"), "node_id");
        Long taskId = asLong(params.get("task_id"), "task_id");
        if (taskId == null) {
            throw ApiException.badRequest("task_id is required");
        }

        Map<String, Object> task = loadTaskContext(taskId, viewerUserId, viewerRoles);
        String nodeName = requiredText(params.get("node_name"), "node_name is required");
        String nodeType = defaultText(params.get("node_type"), "DEFAULT");
        String description = optionalText(params.get("description"));
        String useYn = normalizeYn(params.get("use_yn"), "Y", "use_yn");
        String insertMode = normalizeInsertMode(params.get("insert_mode"));

        Long parentNodeId = resolveParentNodeId(taskId, nodeId, insertMode, asLong(params.get("parent_node_id"), "parent_node_id"));
        int depth = parentNodeId == null ? 0 : depthOf(parentNodeId) + 1;

        Map<String, Object> payload = new LinkedHashMap<String, Object>();
        payload.put("node_id", nodeId);
        payload.put("task_id", taskId);
        payload.put("parent_node_id", parentNodeId);
        payload.put("node_name", nodeName);
        payload.put("node_type", nodeType);
        payload.put("sort_order", nextSortOrder(taskId, parentNodeId));
        payload.put("depth", depth);
        payload.put("description", description);
        payload.put("use_yn", useYn);
        payload.put("created_by", viewerUserId);
        payload.put("updated_by", viewerUserId);

        if (nodeId == null) {
            nodeMapper.syncTaskNodeSequence();
            nodeMapper.insertNode(payload);
            nodeId = asLong(payload.get("node_id"), "node_id");
        } else {
            Map<String, Object> existing = nodeMapper.selectNodeDetail(accessParamsByNode(nodeId, viewerUserId, viewerRoles));
            if (existing == null || existing.isEmpty()) {
                throw new ApiException(ApiCode.NOT_FOUND, HttpStatus.NOT_FOUND, "node not found");
            }
            Long existingTaskId = asLong(existing.get("task_id"), "task_id");
            if (!taskId.equals(existingTaskId)) {
                throw ApiException.badRequest("task_id mismatch");
            }
            if (parentNodeId != null && parentNodeId.equals(nodeId)) {
                throw ApiException.badRequest("parent_node_id is invalid");
            }
            validateParent(taskId, parentNodeId, nodeId);
            payload.put("sort_order", asInt(existing.get("sort_order"), 0));
            payload.put("depth", depth);
            nodeMapper.updateNode(payload);
            int depthDelta = depth - asInt(existing.get("depth"), 0);
            if (depthDelta != 0) {
                Map<String, Object> depthPayload = new LinkedHashMap<String, Object>();
                depthPayload.put("node_id", nodeId);
                depthPayload.put("depth_delta", depthDelta);
                nodeMapper.updateNodeSubtreeDepth(depthPayload);
            }
        }

        saveNodeMetrics(nodeId, stringValue(task.get("task_type_code")), params.get("metrics"), viewerUserId);
        return getNodeDetail(Collections.<String, Object>singletonMap("node_id", nodeId), viewerUserId, viewerRoles);
    }

    @Override
    @Transactional
    public Map<String, Object> moveNode(Map<String, Object> params, String viewerUserId, List<String> viewerRoles) {
        Long nodeId = asLong(valueOf(params, "node_id"), "node_id");
        if (nodeId == null) {
            throw ApiException.badRequest("node_id is required");
        }

        Map<String, Object> current = nodeMapper.selectNodeSummary(nodeId);
        if (current == null || current.isEmpty()) {
            throw new ApiException(ApiCode.NOT_FOUND, HttpStatus.NOT_FOUND, "node not found");
        }

        Map<String, Object> accessNode = nodeMapper.selectNodeDetail(accessParamsByNode(nodeId, viewerUserId, viewerRoles));
        if (accessNode == null || accessNode.isEmpty()) {
            throw new ApiException(ApiCode.NOT_FOUND, HttpStatus.NOT_FOUND, "node not found");
        }

        Long taskId = asLong(current.get("task_id"), "task_id");
        Long targetParentNodeId = asLong(params.get("target_parent_node_id"), "target_parent_node_id");
        validateParent(taskId, targetParentNodeId, nodeId);

        int newDepth = targetParentNodeId == null ? 0 : depthOf(targetParentNodeId) + 1;
        int oldDepth = asInt(current.get("depth"), 0);

        Map<String, Object> movePayload = new LinkedHashMap<String, Object>();
        movePayload.put("node_id", nodeId);
        movePayload.put("parent_node_id", targetParentNodeId);
        movePayload.put("sort_order", nextSortOrder(taskId, targetParentNodeId));
        movePayload.put("depth", newDepth);
        movePayload.put("updated_by", viewerUserId);
        nodeMapper.updateNodePlacement(movePayload);

        int depthDelta = newDepth - oldDepth;
        if (depthDelta != 0) {
            Map<String, Object> depthPayload = new LinkedHashMap<String, Object>();
            depthPayload.put("node_id", nodeId);
            depthPayload.put("depth_delta", depthDelta);
            nodeMapper.updateNodeSubtreeDepth(depthPayload);
        }

        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("node_id", nodeId);
        result.put("parent_node_id", targetParentNodeId);
        result.put("sort_order", movePayload.get("sort_order"));
        result.put("depth", Integer.valueOf(newDepth));
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> deleteNode(Map<String, Object> params, String viewerUserId, List<String> viewerRoles) {
        Long nodeId = asLong(valueOf(params, "node_id"), "node_id");
        if (nodeId == null) {
            throw ApiException.badRequest("node_id is required");
        }

        Map<String, Object> existing = nodeMapper.selectNodeDetail(accessParamsByNode(nodeId, viewerUserId, viewerRoles));
        if (existing == null || existing.isEmpty()) {
            throw new ApiException(ApiCode.NOT_FOUND, HttpStatus.NOT_FOUND, "node not found");
        }
        if (nodeMapper.countNodeChildren(nodeId) > 0) {
            throw new ApiException(ApiCode.BIZ_ERROR, HttpStatus.CONFLICT, "child nodes exist");
        }

        nodeMapper.deleteNodeMetrics(nodeId);
        nodeMapper.deleteNode(nodeId);

        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("node_id", nodeId);
        result.put("deleted", Boolean.TRUE);
        return result;
    }

    @Override
    public List<Map<String, Object>> getTaskTypeList() {
        return nodeMapper.selectTaskTypeList();
    }

    @Override
    public List<Map<String, Object>> getTaskTypeMetricList(Map<String, Object> params) {
        String taskTypeCode = requiredText(valueOf(params, "task_type_code"), "task_type_code is required");
        return nodeMapper.selectTaskTypeMetrics(taskTypeCode);
    }

    @Override
    @Transactional
    public Map<String, Object> saveTaskTypeMetrics(Map<String, Object> params, String viewerUserId, List<String> viewerRoles) {
        ensureAdmin(viewerRoles);
        String taskTypeCode = requiredText(valueOf(params, "task_type_code"), "task_type_code is required");
        List<Map<String, Object>> metrics = castMetricList(params.get("metrics"));
        if (metrics.size() > MAX_METRIC_COUNT) {
            throw ApiException.badRequest("metric count must be 10 or less");
        }

        Set<String> names = new HashSet<String>();
        Set<Integer> orders = new HashSet<Integer>();
        List<Long> activeMetricIds = new ArrayList<Long>();

        for (Map<String, Object> metric : metrics) {
            String metricName = requiredText(metric.get("metric_name"), "metric_name is required");
            Integer displayOrder = Integer.valueOf(asInt(metric.get("display_order"), -1));
            if (displayOrder.intValue() < 0) {
                throw ApiException.badRequest("display_order must be zero or greater");
            }
            if (!names.add(metricName)) {
                throw ApiException.badRequest("metric_name must be unique");
            }
            if (!orders.add(displayOrder)) {
                throw ApiException.badRequest("display_order must be unique");
            }

            Map<String, Object> payload = new LinkedHashMap<String, Object>();
            payload.put("metric_def_id", asLong(metric.get("metric_def_id"), "metric_def_id"));
            payload.put("task_type_code", taskTypeCode);
            payload.put("metric_name", metricName);
            payload.put("include_in_stats_yn", normalizeYn(metric.get("include_in_stats_yn"), "Y", "include_in_stats_yn"));
            payload.put("value_slot_count", Integer.valueOf(normalizeValueSlotCount(metric.get("value_slot_count"))));
            payload.put("display_order", displayOrder);
            payload.put("use_yn", normalizeYn(metric.get("use_yn"), "Y", "use_yn"));
            payload.put("created_by", viewerUserId);
            payload.put("updated_by", viewerUserId);

            if (payload.get("metric_def_id") == null) {
                nodeMapper.syncTaskTypeMetricDefSequence();
            }
            nodeMapper.upsertTaskTypeMetricDef(payload);
            Long savedMetricId = asLong(payload.get("metric_def_id"), "metric_def_id");
            if (savedMetricId != null) {
                activeMetricIds.add(savedMetricId);
            }
        }

        Map<String, Object> deactivateParams = new HashMap<String, Object>();
        deactivateParams.put("task_type_code", taskTypeCode);
        deactivateParams.put("metric_ids", activeMetricIds);
        deactivateParams.put("updated_by", viewerUserId);
        nodeMapper.deactivateTaskTypeMetricDefs(deactivateParams);

        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("task_type_code", taskTypeCode);
        result.put("saved_count", Integer.valueOf(metrics.size()));
        return result;
    }

    private Map<String, Object> loadTaskContext(Long taskId, String viewerUserId, List<String> viewerRoles) {
        Map<String, Object> task = nodeMapper.selectTaskContext(accessParams(taskId, viewerUserId, viewerRoles));
        if (task == null || task.isEmpty()) {
            throw new ApiException(ApiCode.NOT_FOUND, HttpStatus.NOT_FOUND, "task not found");
        }
        return task;
    }

    private Map<String, Object> accessParams(Long taskId, String viewerUserId, List<String> viewerRoles) {
        Map<String, Object> query = new LinkedHashMap<String, Object>();
        query.put("task_id", taskId);
        query.put("viewer_user_id", viewerUserId);
        query.put("viewer_is_admin", RoleSupport.isAdmin(viewerRoles));
        return query;
    }

    private Map<String, Object> accessParamsByNode(Long nodeId, String viewerUserId, List<String> viewerRoles) {
        Map<String, Object> query = new LinkedHashMap<String, Object>();
        query.put("node_id", nodeId);
        query.put("viewer_user_id", viewerUserId);
        query.put("viewer_is_admin", RoleSupport.isAdmin(viewerRoles));
        return query;
    }

    private void saveNodeMetrics(Long nodeId, String taskTypeCode, Object rawMetrics, String viewerUserId) {
        List<Map<String, Object>> metrics = castMetricList(rawMetrics);
        if (metrics.size() > MAX_METRIC_COUNT) {
            throw ApiException.badRequest("metric count must be 10 or less");
        }

        nodeMapper.deleteNodeMetrics(nodeId);
        for (Map<String, Object> metric : metrics) {
            Long metricDefId = asLong(metric.get("metric_def_id"), "metric_def_id");
            if (metricDefId == null) {
                throw ApiException.badRequest("metric_def_id is required");
            }
            Map<String, Object> metricDef = nodeMapper.selectTaskTypeMetricDef(new LinkedHashMap<String, Object>() {{
                put("metric_def_id", metricDefId);
                put("task_type_code", taskTypeCode);
            }});
            if (metricDef == null || metricDef.isEmpty()) {
                throw ApiException.badRequest("metric_def_id is invalid");
            }

            Map<String, Object> payload = new LinkedHashMap<String, Object>();
            payload.put("node_metric_value_id", null);
            payload.put("node_id", nodeId);
            payload.put("metric_def_id", metricDefId);
            payload.put("value_1", optionalText(metric.get("value_1")));
            payload.put("value_2", optionalText(metric.get("value_2")));
            payload.put("value_3", optionalText(metric.get("value_3")));
            payload.put("created_by", viewerUserId);
            payload.put("updated_by", viewerUserId);
            nodeMapper.syncNodeMetricValueSequence();
            nodeMapper.upsertNodeMetricValue(payload);
        }
    }

    private void validateParent(Long taskId, Long parentNodeId, Long nodeId) {
        if (parentNodeId == null) {
            return;
        }
        Map<String, Object> parent = nodeMapper.selectNodeSummary(parentNodeId);
        if (parent == null || parent.isEmpty()) {
            throw ApiException.badRequest("parent_node_id is invalid");
        }
        if (!taskId.equals(asLong(parent.get("task_id"), "task_id"))) {
            throw ApiException.badRequest("parent node must belong to same task");
        }
        if (nodeId != null) {
            if (nodeId.equals(parentNodeId)) {
                throw ApiException.badRequest("parent_node_id is invalid");
            }
            if (isDescendant(nodeId, parentNodeId)) {
                throw ApiException.badRequest("cannot move under descendant node");
            }
        }
    }

    private boolean isDescendant(Long nodeId, Long targetParentNodeId) {
        Long current = targetParentNodeId;
        while (current != null) {
            if (nodeId.equals(current)) {
                return true;
            }
            Map<String, Object> summary = nodeMapper.selectNodeSummary(current);
            if (summary == null || summary.isEmpty()) {
                return false;
            }
            current = asLong(summary.get("parent_node_id"), "parent_node_id");
        }
        return false;
    }

    private int nextSortOrder(Long taskId, Long parentNodeId) {
        Map<String, Object> params = new LinkedHashMap<String, Object>();
        params.put("task_id", taskId);
        params.put("parent_node_id", parentNodeId);
        Integer next = nodeMapper.selectNextSortOrder(params);
        return next == null ? 1 : next.intValue();
    }

    private int depthOf(Long nodeId) {
        Map<String, Object> summary = nodeMapper.selectNodeSummary(nodeId);
        if (summary == null || summary.isEmpty()) {
            throw ApiException.badRequest("parent_node_id is invalid");
        }
        return asInt(summary.get("depth"), 0);
    }

    private Long resolveParentNodeId(Long taskId, Long nodeId, String insertMode, Long parentNodeId) {
        if ("ROOT".equals(insertMode)) {
            return null;
        }
        if ("CHILD".equals(insertMode) || nodeId != null) {
            validateParent(taskId, parentNodeId, nodeId);
            return parentNodeId;
        }
        if ("SIBLING".equals(insertMode)) {
            if (parentNodeId == null) {
                return null;
            }
            Map<String, Object> sibling = nodeMapper.selectNodeSummary(parentNodeId);
            if (sibling == null || sibling.isEmpty()) {
                throw ApiException.badRequest("parent_node_id is invalid");
            }
            if (!taskId.equals(asLong(sibling.get("task_id"), "task_id"))) {
                throw ApiException.badRequest("parent node must belong to same task");
            }
            return asLong(sibling.get("parent_node_id"), "parent_node_id");
        }
        validateParent(taskId, parentNodeId, nodeId);
        return parentNodeId;
    }

    private void ensureAdmin(List<String> viewerRoles) {
        if (!RoleSupport.isAdmin(viewerRoles)) {
            throw new ApiException(ApiCode.FORBIDDEN, HttpStatus.FORBIDDEN, ApiCode.FORBIDDEN.defaultMessage());
        }
    }

    private List<Map<String, Object>> castMetricList(Object rawMetrics) {
        if (rawMetrics == null) {
            return Collections.emptyList();
        }
        if (!(rawMetrics instanceof List)) {
            throw ApiException.badRequest("metrics must be a list");
        }
        List<?> rawList = (List<?>) rawMetrics;
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();
        for (Object item : rawList) {
            if (!(item instanceof Map)) {
                throw ApiException.badRequest("metrics item must be an object");
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> metric = new LinkedHashMap<String, Object>((Map<String, Object>) item);
            result.add(metric);
        }
        return result;
    }

    private String normalizeInsertMode(Object value) {
        String mode = defaultText(value, "CHILD").toUpperCase();
        if (!ALLOWED_INSERT_MODES.contains(mode)) {
            throw ApiException.badRequest("insert_mode is invalid");
        }
        return mode;
    }

    private int normalizeValueSlotCount(Object value) {
        int slotCount = asInt(value, 3);
        if (slotCount < 1 || slotCount > 3) {
            throw ApiException.badRequest("value_slot_count must be between 1 and 3");
        }
        return slotCount;
    }

    private String normalizeYn(Object value, String defaultValue, String fieldName) {
        String text = defaultText(value, defaultValue).toUpperCase();
        if (!"Y".equals(text) && !"N".equals(text)) {
            throw ApiException.badRequest(fieldName + " must be Y or N");
        }
        return text;
    }

    private String requiredText(Object value, String message) {
        String text = optionalText(value);
        if (text == null || text.isEmpty()) {
            throw ApiException.badRequest(message);
        }
        return text;
    }

    private String defaultText(Object value, String defaultValue) {
        String text = optionalText(value);
        return text == null ? defaultValue : text;
    }

    private String optionalText(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private Object valueOf(Map<String, Object> params, String key) {
        return params == null ? null : params.get(key);
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private int asInt(Object value, int defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException exception) {
            throw ApiException.badRequest("numeric value is invalid");
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
