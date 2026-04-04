package com.realhogoo.jsschedule.calendar.mapper;

import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

@Mapper
public interface CalendarMapper {
    List<Map<String, Object>> selectMonthEvents(Map<String, Object> params);
}
