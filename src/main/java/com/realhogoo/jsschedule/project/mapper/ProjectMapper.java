package com.realhogoo.jsschedule.project.mapper;

import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

@Mapper
public interface ProjectMapper {
    List<Map<String, Object>> selectProjectList(Map<String, Object> params);
}
