package com.realhogoo.jsschedule.task.mapper;

import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

@Mapper
public interface TaskMapper {
    List<Map<String, Object>> selectTaskList(Map<String, Object> params);
    Map<String, Object> selectTaskDetail(Map<String, Object> params);
    Map<String, Object> selectTaskReference(Map<String, Object> params);
    Map<String, Object> selectTaskCommentReference(Map<String, Object> params);
    Map<String, Object> selectProjectReference(Map<String, Object> params);
    List<Map<String, Object>> selectProjectTaskReferences(Map<String, Object> params);
    List<Map<String, Object>> selectTaskCommentList(Map<String, Object> params);
    int countAccessibleProject(Map<String, Object> params);
    int countAssignableProjectUser(Map<String, Object> params);
    int countTaskCommentReply(Map<String, Object> params);
    void syncTaskSequence();
    void insertTask(Map<String, Object> params);
    void updateTask(Map<String, Object> params);
    void insertTaskComment(Map<String, Object> params);
    int deleteTaskComment(Map<String, Object> params);
}
