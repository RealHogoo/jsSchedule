package com.realhogoo.jsschedule.health.web;

import com.realhogoo.jsschedule.health.mapper.HealthMapper;
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    private final DataSource dataSource;
    private final HealthMapper healthMapper;

    public HealthController(DataSource dataSource, HealthMapper healthMapper) {
        this.dataSource = dataSource;
        this.healthMapper = healthMapper;
    }

    @PostMapping("/health/live.json")
    public Map<String, Object> live() {
        return ok("UP", null);
    }

    @PostMapping("/health/ready.json")
    public Map<String, Object> ready() {
        return ok(isDatabaseReady() ? "UP" : "DOWN", databaseStatus());
    }

    @PostMapping("/health/status.json")
    public Map<String, Object> status() {
        return ok(isDatabaseReady() ? "UP" : "DEGRADED", databaseStatus());
    }

    private boolean isDatabaseReady() {
        Map<String, Object> database = databaseStatus();
        return Boolean.TRUE.equals(database.get("ok"));
    }

    private Map<String, Object> databaseStatus() {
        Map<String, Object> data = new HashMap<String, Object>();
        long startedAt = System.currentTimeMillis();
        try (Connection connection = dataSource.getConnection()) {
            boolean valid = connection.isValid(2);
            Integer ping = healthMapper.ping();
            data.put("ok", valid && ping != null && ping.intValue() == 1);
            data.put("ping", ping);
        } catch (Exception exception) {
            data.put("ok", false);
            data.put("error", exception.getMessage());
        }
        data.put("elapsed_ms", System.currentTimeMillis() - startedAt);

        if (dataSource instanceof HikariDataSource) {
            HikariPoolMXBean pool = ((HikariDataSource) dataSource).getHikariPoolMXBean();
            if (pool != null) {
                Map<String, Object> poolInfo = new HashMap<String, Object>();
                poolInfo.put("active", pool.getActiveConnections());
                poolInfo.put("idle", pool.getIdleConnections());
                poolInfo.put("total", pool.getTotalConnections());
                data.put("pool", poolInfo);
            }
        }
        return data;
    }

    private Map<String, Object> ok(String status, Map<String, Object> db) {
        Map<String, Object> data = new HashMap<String, Object>();
        data.put("service", "schedule-service");
        data.put("status", status);
        data.put("checked_at", Instant.now().toString());
        if (db != null) {
            data.put("db", db);
        }

        Map<String, Object> response = new HashMap<String, Object>();
        response.put("ok", true);
        response.put("code", "OK");
        response.put("message", "success");
        response.put("data", data);
        return response;
    }
}
