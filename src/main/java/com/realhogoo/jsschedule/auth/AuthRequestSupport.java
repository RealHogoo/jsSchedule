package com.realhogoo.jsschedule.auth;

import javax.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.List;
import java.util.Map;

public final class AuthRequestSupport {

    private AuthRequestSupport() {
    }

    @SuppressWarnings("unchecked")
    public static List<String> viewerRoles(HttpServletRequest request) {
        Object rolesAttr = request.getAttribute("roles");
        return rolesAttr instanceof List ? (List<String>) rolesAttr : Collections.<String>emptyList();
    }

    public static String viewerUserId(HttpServletRequest request) {
        return request.getAttribute("user_id") == null ? "" : String.valueOf(request.getAttribute("user_id"));
    }

    @SuppressWarnings("unchecked")
    public static Map<String, List<String>> viewerServicePermissions(HttpServletRequest request) {
        Object permissions = request.getAttribute("service_permissions");
        return permissions instanceof Map ? (Map<String, List<String>>) permissions : Collections.<String, List<String>>emptyMap();
    }
}
