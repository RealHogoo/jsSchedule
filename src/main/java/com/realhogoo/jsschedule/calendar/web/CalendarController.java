package com.realhogoo.jsschedule.calendar.web;

import com.realhogoo.jsschedule.api.ApiResponse;
import com.realhogoo.jsschedule.calendar.service.CalendarService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.Map;

@RestController
public class CalendarController {

    private final CalendarService calendarService;

    public CalendarController(CalendarService calendarService) {
        this.calendarService = calendarService;
    }

    @PostMapping("/calendar/month.json")
    public ApiResponse<Object> month(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        return ApiResponse.ok(calendarService.getMonthEvents(body), request);
    }
}
