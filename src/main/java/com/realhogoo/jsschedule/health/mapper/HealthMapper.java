package com.realhogoo.jsschedule.health.mapper;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface HealthMapper {
    Integer ping();
}
