(function (global) {
    "use strict";

    var UX = global.UX;
    var state = {
        sidebarOpen: false,
        projectStats: [],
        monthlyStats: []
    };

    function byId(id) { return UX.byId(id); }
    function esc(value) { return UX.esc(value == null ? "" : String(value)); }
    function redirectToLogin() { global.location.href = "/"; }

    function typeLabel(type) {
        if (type === "DEVELOPMENT") return "개발";
        if (type === "BLOG") return "블로그";
        return "일반";
    }

    function number(value) {
        var n = Number(value || 0);
        return isNaN(n) ? 0 : n;
    }

    function formatCount(value) {
        return String(Math.round(number(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function formatMoney(value) {
        return formatCount(value) + "원";
    }

    function formatPercent(value) {
        return formatCount(value) + "%";
    }

    function formatDate(value) {
        return value ? String(value).slice(0, 10) : "-";
    }

    function formatPeriod(start, end) {
        return formatDate(start) + " ~ " + formatDate(end);
    }

    function mainMetricText(row) {
        if (row.project_type_code === "BLOG") return formatMoney(row.main_metric_value);
        return formatPercent(row.main_metric_value);
    }

    function subMetricText(row) {
        if (row.project_type_code === "BLOG") return formatMoney(row.sub_metric_value);
        return formatCount(row.sub_metric_value) + "건";
    }

    function monthlyMainText(row) {
        if (row.project_type_code === "BLOG") return "지원 " + formatMoney(row.support_total);
        return "진행률 " + formatPercent(row.progress_avg);
    }

    function monthlySubText(row) {
        if (row.project_type_code === "BLOG") return "사용 " + formatMoney(row.actual_total);
        return "완료 " + formatCount(row.done_count) + "건";
    }

    function bindInfo(targetId, rows) {
        var target = byId(targetId);
        if (!target) return;
        target.innerHTML = rows.map(function (row) {
            return "<dt>" + esc(row.label) + "</dt><dd>" + esc(row.value) + "</dd>";
        }).join("");
    }

    function renderSummary(summary) {
        var target = byId("summaryCards");
        var cards;
        if (!target) return;
        cards = [
            { label: "프로젝트", value: summary.project_total || 0 },
            { label: "태스크", value: summary.task_total || 0 },
            { label: "진행", value: summary.task_in_progress || 0 },
            { label: "완료", value: summary.task_done || 0 }
        ];
        target.innerHTML = cards.map(function (card) {
            return "<article class=\"summary-card\"><span>" + esc(card.label) + "</span><strong>" + esc(formatCount(card.value)) + "</strong></article>";
        }).join("");
    }

    function renderProjectStats() {
        var target = byId("projectStats");
        if (!target) return;
        if (!state.projectStats.length) {
            target.innerHTML = "<div class=\"detail-empty\">프로젝트 없음</div>";
            return;
        }
        target.innerHTML = state.projectStats.map(function (row) {
            var type = String(row.project_type_code || "GENERAL");
            var period = type === "DEVELOPMENT"
                ? "목표 " + formatPeriod(row.target_start_date, row.target_end_date) + "<br>실제 " + formatPeriod(row.actual_start_date, row.actual_end_date)
                : "기간 " + formatPeriod(row.project_start_date, row.project_end_date);
            return "<article class=\"dashboard-project-card type-" + esc(type.toLowerCase()) + "\">"
                + "<div class=\"dashboard-card-head\">"
                + "<div><strong>" + esc(row.project_name || "-") + "</strong><span>" + esc(row.project_key || "-") + "</span></div>"
                + "<em>" + esc(typeLabel(type)) + "</em>"
                + "</div>"
                + "<div class=\"dashboard-metric-row\">"
                + "<div><span>" + esc(row.main_metric_label || "지표") + "</span><strong>" + esc(mainMetricText(row)) + "</strong></div>"
                + "<div><span>" + esc(row.sub_metric_label || "보조") + "</span><strong>" + esc(subMetricText(row)) + "</strong></div>"
                + "<div><span>태스크</span><strong>" + esc(formatCount(row.task_count)) + "건</strong></div>"
                + "</div>"
                + "<p class=\"dashboard-period\">" + period + "</p>"
                + "</article>";
        }).join("");
    }

    function renderMonthlyStats() {
        var target = byId("monthlyStats");
        if (!target) return;
        if (!state.monthlyStats.length) {
            target.innerHTML = "<tr><td colspan=\"5\" class=\"empty-row\">월별 데이터 없음</td></tr>";
            return;
        }
        target.innerHTML = state.monthlyStats.map(function (row) {
            return "<tr>"
                + "<td>" + esc(row.month_key || "-") + "</td>"
                + "<td>" + esc(typeLabel(String(row.project_type_code || "GENERAL"))) + "</td>"
                + "<td>" + esc(formatCount(row.task_count)) + "건</td>"
                + "<td>" + esc(monthlyMainText(row)) + "</td>"
                + "<td>" + esc(monthlySubText(row)) + "</td>"
                + "</tr>";
        }).join("");
    }

    function readFilters() {
        return {
            project_type_code: byId("filterType").value
        };
    }

    function loadDashboard() {
        return Promise.all([
            UX.requestJson("/auth/me.json", {}),
            UX.requestJson("/dashboard/detail.json", readFilters())
        ]).then(function (results) {
            var me = results[0];
            var dashboard = results[1];
            var data;
            if (!me || me.ok !== true || !dashboard || dashboard.ok !== true) {
                redirectToLogin();
                return;
            }
            data = dashboard.data || {};
            bindInfo("currentUser", [
                { label: "아이디", value: (me.data && me.data.user_id) || "-" },
                { label: "이름", value: (me.data && me.data.user_nm) || "-" },
                { label: "권한", value: (me.data && me.data.roles || []).join(", ") || "-" }
            ]);
            renderSummary(data.summary || {});
            state.projectStats = Array.isArray(data.project_stats) ? data.project_stats : [];
            state.monthlyStats = Array.isArray(data.monthly_stats) ? data.monthly_stats : [];
            renderProjectStats();
            renderMonthlyStats();
        }).catch(function () {
            redirectToLogin();
        });
    }

    function resetFilters() {
        byId("filterType").value = "";
        loadDashboard();
    }

    function logout() {
        UX.requestJson("/logout.json", {}).finally(function () {
            UX.localRemove(["JWT", "REFRESH_TOKEN", "LOGIN_USER", "LOGIN_SESSION_ID"]);
            redirectToLogin();
        });
    }

    function isMobileViewport() {
        return global.matchMedia && global.matchMedia("(max-width: 768px)").matches;
    }

    function setSidebarOpen(open) {
        var sidebar = byId("workspaceSidebar");
        var toggle = byId("btnSidebarToggle");
        state.sidebarOpen = !!open;
        if (!sidebar || !toggle) return;
        if (isMobileViewport()) {
            UX.setText(toggle, state.sidebarOpen ? "닫기" : "메뉴");
            sidebar.classList.toggle("is-open", state.sidebarOpen);
        } else {
            UX.setText(toggle, "메뉴");
            sidebar.classList.remove("is-open");
        }
    }

    function syncSidebarMode() {
        if (isMobileViewport()) {
            setSidebarOpen(false);
            return;
        }
        setSidebarOpen(true);
    }

    function bindEvents() {
        UX.bindOnce(byId("btnSearch"), "click", loadDashboard);
        UX.bindOnce(byId("btnReset"), "click", resetFilters);
        UX.bindOnce(byId("btnReload"), "click", loadDashboard);
        UX.bindOnce(byId("btnLogout"), "click", logout);
        UX.bindOnce(byId("btnSidebarToggle"), "click", function () { setSidebarOpen(!state.sidebarOpen); });
        UX.bindOnce(byId("filterType"), "change", loadDashboard);
        global.addEventListener("resize", syncSidebarMode);
    }

    bindEvents();
    syncSidebarMode();
    loadDashboard();
})(window);
