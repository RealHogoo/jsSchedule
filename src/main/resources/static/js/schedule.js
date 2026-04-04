(function (global) {
    "use strict";

    var UX = global.UX;

    function redirectToLogin() {
        global.location.href = "/";
    }

    function request(url) {
        return UX.requestJson(url, {});
    }

    function bindInfo(targetId, rows) {
        var target = UX.byId(targetId);
        if (!target) return;
        target.innerHTML = rows.map(function (row) {
            return "<dt>" + UX.esc(row.label) + "</dt><dd>" + UX.esc(row.value) + "</dd>";
        }).join("");
    }

    function load() {
        Promise.all([
            request("/auth/me.json"),
            request("/dashboard/summary.json")
        ]).then(function (results) {
            var me = results[0];
            var dashboard = results[1];

            if (!me || me.ok !== true || !dashboard || dashboard.ok !== true) {
                redirectToLogin();
                return;
            }

            var user = me.data || {};
            var summary = (dashboard.data && dashboard.data.summary) || {};

            bindInfo("currentUser", [
                { label: "아이디", value: user.user_id || "-" },
                { label: "이름", value: user.user_nm || "-" },
                { label: "권한", value: (user.roles || []).join(", ") || "-" },
                { label: "세션", value: user.session_id || "-" }
            ]);

            bindInfo("summaryInfo", [
                { label: "프로젝트 전체", value: String(summary.project_total || 0) },
                { label: "진행 중 프로젝트", value: String(summary.project_in_progress || 0) },
                { label: "작업 전체", value: String(summary.task_total || 0) },
                { label: "진행 중 작업", value: String(summary.task_in_progress || 0) },
                { label: "임박 마일스톤", value: String(summary.upcoming_milestone_count || 0) }
            ]);
        }).catch(function () {
            redirectToLogin();
        });
    }

    function logout() {
        UX.requestJson("/logout.json", {}).finally(function () {
            UX.localRemove(["JWT", "REFRESH_TOKEN", "LOGIN_USER", "LOGIN_SESSION_ID"]);
            redirectToLogin();
        });
    }

    UX.bindOnce(UX.byId("btnRefresh"), "click", load);
    UX.bindOnce(UX.byId("btnLogout"), "click", logout);
    load();
})(window);
