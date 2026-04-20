package com.realhogoo.jsschedule.auth;

import javax.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.List;

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
}
