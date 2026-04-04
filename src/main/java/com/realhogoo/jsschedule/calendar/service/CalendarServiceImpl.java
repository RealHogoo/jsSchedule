package com.realhogoo.jsschedule.calendar.service;

import com.realhogoo.jsschedule.calendar.mapper.CalendarMapper;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class CalendarServiceImpl implements CalendarService {

    private final CalendarMapper calendarMapper;

    public CalendarServiceImpl(CalendarMapper calendarMapper) {
        this.calendarMapper = calendarMapper;
    }

    @Override
    public List<Map<String, Object>> getMonthEvents(Map<String, Object> params) {
        return calendarMapper.selectMonthEvents(params == null ? Collections.<String, Object>emptyMap() : params);
    }
}
