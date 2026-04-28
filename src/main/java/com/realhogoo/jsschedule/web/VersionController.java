package com.realhogoo.jsschedule.web;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class VersionController {

    private final GitRevisionProvider gitRevisionProvider;

    public VersionController(GitRevisionProvider gitRevisionProvider) {
        this.gitRevisionProvider = gitRevisionProvider;
    }

    @PostMapping("/version.json")
    public Map<String, Object> version() {
        Map<String, Object> data = new HashMap<String, Object>();
        data.put("service", "schedule-service");
        data.put("revision", gitRevisionProvider.getShortRevision());

        Map<String, Object> response = new HashMap<String, Object>();
        response.put("ok", true);
        response.put("code", "OK");
        response.put("message", "success");
        response.put("data", data);
        return response;
    }
}
