package com.realhogoo.jsschedule.auth;

import java.util.List;

public final class RoleSupport {

    private RoleSupport() {
    }

    public static boolean isAdmin(List<String> viewerRoles) {
        if (viewerRoles == null || viewerRoles.isEmpty()) {
            return false;
        }
        return viewerRoles.contains("ROLE_ADMIN") || viewerRoles.contains("ROLE_SUPER_ADMIN");
    }
}
