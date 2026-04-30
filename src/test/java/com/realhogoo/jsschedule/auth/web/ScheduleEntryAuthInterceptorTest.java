package com.realhogoo.jsschedule.auth.web;

import com.realhogoo.jsschedule.integration.admin.AdminServiceClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
    "admin-service.public-base-url=https://adm.js65.myds.me",
    "SCHEDULE_SERVICE_PUBLIC_BASE_URL=https://sch.js65.myds.me"
})
@AutoConfigureMockMvc
class ScheduleEntryAuthInterceptorTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdminServiceClient adminServiceClient;

    @Test
    void redirectsUnauthenticatedRequestToPublicAdminLoginUrlUsingForwardedHeaders() throws Exception {
        when(adminServiceClient.fetchCurrentUser(anyString())).thenReturn(Collections.emptyMap());

        String expectedRedirect =
            "https://adm.js65.myds.me/service-login-page.do?service_nm="
                + URLEncoder.encode("Schedule Service", StandardCharsets.UTF_8)
                + "&return_url="
                + URLEncoder.encode("https://sch.js65.myds.me/schedule.html", StandardCharsets.UTF_8);

        mockMvc.perform(get("/schedule.html")
                .header("X-Forwarded-Proto", "https")
                .header("X-Forwarded-Host", "sch.js65.myds.me")
                .header("X-Forwarded-Port", "80"))
            .andExpect(status().is3xxRedirection())
            .andExpect(redirectedUrl(expectedRedirect));
    }

    @Test
    void redirectsUnauthenticatedRequestWithQueryStringUsingForwardedPublicUrl() throws Exception {
        when(adminServiceClient.fetchCurrentUser(anyString())).thenReturn(Collections.emptyMap());

        String expectedRedirect =
            "https://adm.js65.myds.me/service-login-page.do?service_nm="
                + URLEncoder.encode("Schedule Service", StandardCharsets.UTF_8)
                + "&return_url="
                + URLEncoder.encode("https://sch.js65.myds.me/task-form.html?project_id=3", StandardCharsets.UTF_8);

        mockMvc.perform(get("/task-form.html")
                .queryParam("project_id", "3")
                .header("X-Forwarded-Proto", "https")
                .header("X-Forwarded-Host", "sch.js65.myds.me")
                .header("X-Forwarded-Port", "80"))
            .andExpect(status().is3xxRedirection())
            .andExpect(redirectedUrl(expectedRedirect));
    }

    @Test
    void redirectsUnauthenticatedRequestUsingScheduleServicePublicBaseUrl() throws Exception {
        when(adminServiceClient.fetchCurrentUser(anyString())).thenReturn(Collections.emptyMap());

        String expectedRedirect =
            "https://adm.js65.myds.me/service-login-page.do?service_nm="
                + URLEncoder.encode("Schedule Service", StandardCharsets.UTF_8)
                + "&return_url="
                + URLEncoder.encode("https://sch.js65.myds.me/dashboard.html", StandardCharsets.UTF_8);

        mockMvc.perform(get("/dashboard.html"))
            .andExpect(status().is3xxRedirection())
            .andExpect(redirectedUrl(expectedRedirect));
    }

    @Test
    void redirectsInsufficientPermissionRequestToHttpsErrorPage() throws Exception {
        when(adminServiceClient.fetchCurrentUser(anyString())).thenReturn(Collections.singletonMap("user_id", "tester1"));

        mockMvc.perform(get("/task-form.html")
                .cookie(new javax.servlet.http.Cookie(AuthCookieSupport.ACCESS_TOKEN_COOKIE, "TOKEN"))
                .header("X-Forwarded-Proto", "https")
                .header("X-Forwarded-Host", "sch.js65.myds.me")
                .header("X-Forwarded-Port", "80"))
            .andExpect(status().is3xxRedirection())
            .andExpect(redirectedUrl("https://sch.js65.myds.me/error.html?code=S4003&message=%EA%B6%8C%ED%95%9C%EC%9D%B4+%EC%97%86%EC%8A%B5%EB%8B%88%EB%8B%A4.+%EA%B4%80%EB%A6%AC%EC%9E%90%EC%97%90%EA%B2%8C+%EA%B6%8C%ED%95%9C+%EC%84%A4%EC%A0%95%EC%9D%84+%EC%9A%94%EC%B2%AD%ED%95%98%EC%84%B8%EC%9A%94."));
    }
}
