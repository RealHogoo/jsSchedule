package com.realhogoo.jsschedule.auth.web;

import com.realhogoo.jsschedule.integration.admin.AdminServiceClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthProxyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdminServiceClient adminServiceClient;

    @Test
    void loginProxyDelegatesToAdminService() throws Exception {
        Map<String, Object> response = new LinkedHashMap<String, Object>();
        response.put("ok", true);
        response.put("code", "OK");
        response.put("message", "success");
        response.put("data", Collections.singletonMap("token", "proxy-token"));

        when(adminServiceClient.login(anyMap())).thenReturn(response);

        mockMvc.perform(post("/login.json")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"user_id\":\"ADMIN\",\"user_pw\":\"1111\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ok").value(true))
            .andExpect(jsonPath("$.data.token").value("proxy-token"));
    }

    @Test
    void refreshProxyDelegatesToAdminService() throws Exception {
        Map<String, Object> response = new LinkedHashMap<String, Object>();
        response.put("ok", true);
        response.put("code", "OK");
        response.put("message", "success");
        response.put("data", Collections.singletonMap("refresh_token", "next-token"));

        when(adminServiceClient.refresh(anyMap())).thenReturn(response);

        mockMvc.perform(post("/auth/refresh.json")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refresh_token\":\"current-token\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ok").value(true))
            .andExpect(jsonPath("$.data.refresh_token").value("next-token"));
    }
}
