package com.realhogoo.jsschedule.config;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.realhogoo.jsschedule.auth.web.ScheduleEntryAuthInterceptor;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final ScheduleEntryAuthInterceptor scheduleEntryAuthInterceptor;

    public WebMvcConfig(ScheduleEntryAuthInterceptor scheduleEntryAuthInterceptor) {
        this.scheduleEntryAuthInterceptor = scheduleEntryAuthInterceptor;
    }

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jacksonCustomizer() {
        return builder -> builder.propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(scheduleEntryAuthInterceptor)
            .addPathPatterns("/", "/index.html", "/project.html", "/dashboard.html", "/schedule.html", "/calendar.html", "/task.html", "/wbs.html", "/task-form.html", "/project-form.html");
    }
}
