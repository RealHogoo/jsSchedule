package com.realhogoo.jsschedule.task.service;

import java.util.List;
import java.util.Map;

public interface TaskService {
    List<Map<String, Object>> getTaskList(Map<String, Object> params);
}
