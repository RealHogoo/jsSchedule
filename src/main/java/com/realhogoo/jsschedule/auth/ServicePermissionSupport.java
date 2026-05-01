package com.realhogoo.jsschedule.auth;

import com.realhogoo.jsschedule.api.ApiCode;
import com.realhogoo.jsschedule.api.ApiException;
import org.springframework.http.HttpStatus;

import javax.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class ServicePermissionSupport {
    public static final String SCHEDULE_SERVICE = "SCHEDULE_SERVICE";
    public static final String DASHBOARD_ACCESS = "DASHBOARD_ACCESS";
    public static final String WRITE = "WRITE";
    public static final String DELETE = "DELETE";

    private ServicePermissionSupport() {
    }

    public static boolean hasPermission(HttpServletRequest request, String permissionCode) {
        if (RoleSupport.isAdmin(AuthRequestSupport.viewerRoles(request))) {
            return true;
        }
        return hasPermission(AuthRequestSupport.viewerServicePermissions(request), SCHEDULE_SERVICE, permissionCode);
    }

    public static void ensurePermission(HttpServletRequest request, String permissionCode) {
        if (!hasPermission(request, permissionCode)) {
            throw new ApiException(ApiCode.FORBIDDEN, HttpStatus.FORBIDDEN, "\uad8c\ud55c\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uad00\ub9ac\uc790\uc5d0\uac8c \uc2a4\ucf00\uc904\ub7ec \uc811\uadfc \uad8c\ud55c \uc124\uc815\uc744 \uc694\uccad\ud558\uc138\uc694.");
        }
    }

    public static boolean hasPermission(Map<String, List<String>> permissions, String serviceCode, String permissionCode) {
        if (permissions == null || permissions.isEmpty()) {
            return false;
        }
        String normalizedService = normalizeCode(serviceCode);
        String normalizedPermission = normalizeCode(permissionCode);
        if (normalizedService == null || normalizedPermission == null) {
            return false;
        }
        List<String> items = permissions.get(normalizedService);
        return items != null && items.contains(normalizedPermission);
    }

    public static Map<String, List<String>> parsePermissions(Object raw) {
        if (!(raw instanceof Map)) {
            return Collections.emptyMap();
        }

        Map<?, ?> source = (Map<?, ?>) raw;
        Map<String, List<String>> result = new LinkedHashMap<String, List<String>>();
        for (Map.Entry<?, ?> entry : source.entrySet()) {
            String serviceCode = normalizeCode(entry.getKey());
            if (serviceCode == null) {
                continue;
            }
            Set<String> permissions = new LinkedHashSet<String>();
            Object value = entry.getValue();
            if (value instanceof List) {
                for (Object item : (List<?>) value) {
                    String permissionCode = normalizeCode(item);
                    if (permissionCode != null) {
                        permissions.add(permissionCode);
                    }
                }
            }
            result.put(serviceCode, new ArrayList<String>(permissions));
        }
        return result;
    }

    public static String normalizeCode(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
            return null;
        }
        return text.replace('-', '_').replace(' ', '_').toUpperCase(Locale.ROOT);
    }
}
