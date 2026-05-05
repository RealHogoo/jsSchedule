package com.realhogoo.jsschedule.project.mapper;

import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

@Mapper
public interface ProjectMapper {
    List<Map<String, Object>> selectProjectList(Map<String, Object> params);
    Map<String, Object> selectProjectDetail(Map<String, Object> params);
    int countProjectById(Map<String, Object> params);
    int countProjectKey(Map<String, Object> params);
    int insertProject(Map<String, Object> params);
    int updateProject(Map<String, Object> params);
    List<Map<String, Object>> selectProjectMemberList(Map<String, Object> params);
    int countProjectMember(Map<String, Object> params);
    int insertProjectMember(Map<String, Object> params);
    int upsertProjectOwner(Map<String, Object> params);
    int deleteProjectMember(Map<String, Object> params);
}
