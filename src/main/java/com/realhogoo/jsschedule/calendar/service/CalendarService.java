package com.realhogoo.jsschedule.calendar.service;

import java.util.List;
import java.util.Map;

public interface CalendarService {
    List<Map<String, Object>> getMonthEvents(Map<String, Object> params);
}
