package com.realhogoo.jsschedule.dashboard.mapper;

import org.apache.ibatis.annotations.Mapper;

import java.util.Map;

@Mapper
public interface DashboardMapper {
    Map<String, Object> selectSummary(Map<String, Object> params);
}
