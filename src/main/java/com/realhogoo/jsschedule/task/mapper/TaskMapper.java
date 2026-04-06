package com.realhogoo.jsschedule.task.mapper;

import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

@Mapper
public interface TaskMapper {
    List<Map<String, Object>> selectTaskList(Map<String, Object> params);
    Map<String, Object> selectTaskDetail(Map<String, Object> params);
    void syncTaskSequence();
    void insertTask(Map<String, Object> params);
    void updateTask(Map<String, Object> params);
}
