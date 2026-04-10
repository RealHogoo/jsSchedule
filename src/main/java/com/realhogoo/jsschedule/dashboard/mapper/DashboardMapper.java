package com.realhogoo.jsschedule.dashboard.mapper;

import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

@Mapper
public interface DashboardMapper {
    Map<String, Object> selectSummary(Map<String, Object> params);

    List<Map<String, Object>> selectProjectStats(Map<String, Object> params);

    List<Map<String, Object>> selectMonthlyStats(Map<String, Object> params);
}
