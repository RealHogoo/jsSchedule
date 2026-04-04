package com.realhogoo.jsschedule.project.service;

import com.realhogoo.jsschedule.project.mapper.ProjectMapper;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class ProjectServiceImpl implements ProjectService {

    private final ProjectMapper projectMapper;

    public ProjectServiceImpl(ProjectMapper projectMapper) {
        this.projectMapper = projectMapper;
    }

    @Override
    public List<Map<String, Object>> getProjectList(Map<String, Object> params) {
        return projectMapper.selectProjectList(params == null ? Collections.<String, Object>emptyMap() : params);
    }
}
