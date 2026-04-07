package com.realhogoo.jsschedule.node.mapper;

import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

@Mapper
public interface NodeMapper {
    Map<String, Object> selectTaskContext(Map<String, Object> params);
    List<Map<String, Object>> selectNodeTreeRows(Map<String, Object> params);
    Map<String, Object> selectNodeDetail(Map<String, Object> params);
    List<Map<String, Object>> selectNodeMetrics(Long nodeId);
    Map<String, Object> selectNodeSummary(Long nodeId);
    Map<String, Object> selectTaskTypeMetricDef(Map<String, Object> params);
    List<Map<String, Object>> selectTaskTypeList();
    List<Map<String, Object>> selectTaskTypeMetrics(String taskTypeCode);
    int countTaskTypeMetrics(String taskTypeCode);
    void syncTaskNodeSequence();
    void syncTaskTypeMetricDefSequence();
    void syncNodeMetricValueSequence();
    Integer selectNextSortOrder(Map<String, Object> params);
    void insertNode(Map<String, Object> params);
    void updateNode(Map<String, Object> params);
    void updateNodePlacement(Map<String, Object> params);
    void updateNodeSubtreeDepth(Map<String, Object> params);
    int countNodeChildren(Long nodeId);
    int deleteNodeMetrics(Long nodeId);
    int deleteNode(Long nodeId);
    int upsertNodeMetricValue(Map<String, Object> params);
    int upsertTaskTypeMetricDef(Map<String, Object> params);
    int deactivateTaskTypeMetricDefs(Map<String, Object> params);
}
