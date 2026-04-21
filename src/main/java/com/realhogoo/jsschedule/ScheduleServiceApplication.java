package com.realhogoo.jsschedule;

import com.realhogoo.jsschedule.api.SecurityHeadersFilter;
import com.realhogoo.jsschedule.api.TraceIdFilter;
import com.realhogoo.jsschedule.auth.jwt.JwtAuthFilter;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication(scanBasePackages = "com.realhogoo.jsschedule")
public class ScheduleServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ScheduleServiceApplication.class, args);
    }

    @Bean
    public FilterRegistrationBean<SecurityHeadersFilter> securityHeadersFilterRegistration() {
        FilterRegistrationBean<SecurityHeadersFilter> registration = new FilterRegistrationBean<SecurityHeadersFilter>();
        registration.setFilter(new SecurityHeadersFilter());
        registration.setName("securityHeadersFilter");
        registration.addUrlPatterns("/*");
        registration.setOrder(1);
        return registration;
    }

    @Bean
    public FilterRegistrationBean<TraceIdFilter> traceIdFilterRegistration() {
        FilterRegistrationBean<TraceIdFilter> registration = new FilterRegistrationBean<TraceIdFilter>();
        registration.setFilter(new TraceIdFilter());
        registration.setName("traceIdFilter");
        registration.addUrlPatterns("*.json");
        registration.setOrder(2);
        return registration;
    }

    @Bean
    public FilterRegistrationBean<JwtAuthFilter> jwtAuthFilterRegistration() {
        FilterRegistrationBean<JwtAuthFilter> registration = new FilterRegistrationBean<JwtAuthFilter>();
        registration.setFilter(new JwtAuthFilter());
        registration.setName("jwtAuthFilter");
        registration.addUrlPatterns("*.json");
        registration.setOrder(3);
        return registration;
    }

    @Bean
    public RestTemplate restTemplate(
        @Value("${admin-service.connect-timeout-ms:3000}") int connectTimeoutMs,
        @Value("${admin-service.read-timeout-ms:5000}") int readTimeoutMs
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeoutMs);
        requestFactory.setReadTimeout(readTimeoutMs);
        return new RestTemplate(requestFactory);
    }
}
