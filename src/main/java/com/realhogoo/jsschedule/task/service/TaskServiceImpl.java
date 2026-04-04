package com.realhogoo.jsschedule.task.service;

import com.realhogoo.jsschedule.task.mapper.TaskMapper;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class TaskServiceImpl implements TaskService {

    private final TaskMapper taskMapper;

    public TaskServiceImpl(TaskMapper taskMapper) {
        this.taskMapper = taskMapper;
    }

    @Override
    public List<Map<String, Object>> getTaskList(Map<String, Object> params) {
        return taskMapper.selectTaskList(params == null ? Collections.<String, Object>emptyMap() : params);
    }
}
