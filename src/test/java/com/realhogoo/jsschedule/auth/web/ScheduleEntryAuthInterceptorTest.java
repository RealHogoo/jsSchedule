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

@SpringBootTest(properties = "admin-service.public-base-url=https://adm.js65.myds.me")
@AutoConfigureMockMvc
class ScheduleEntryAuthInterceptorTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdminServiceClient adminServiceClient;

    @Test
    void redirectsUnauthenticatedRequestToPublicAdminLoginUrl() throws Exception {
        when(adminServiceClient.fetchCurrentUser(anyString())).thenReturn(Collections.emptyMap());

        String expectedRedirect =
            "https://adm.js65.myds.me/service-login-page.do?service_nm="
                + URLEncoder.encode("Schedule Service", StandardCharsets.UTF_8)
                + "&return_url="
                + URLEncoder.encode("https://sch.js65.myds.me/schedule.html", StandardCharsets.UTF_8);

        mockMvc.perform(get("/schedule.html")
                .header("X-Forwarded-Proto", "https")
                .header("X-Forwarded-Host", "sch.js65.myds.me")
                .header("X-Forwarded-Port", "443"))
            .andExpect(status().is3xxRedirection())
            .andExpect(redirectedUrl(expectedRedirect));
    }
}
