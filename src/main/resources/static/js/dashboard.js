(function (global) {
    "use strict";

    var UX = global.UX;
    var state = {
        sidebarOpen: false,
        activeTab: "project",
        viewMode: "chart",
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

    function typeColor(type) {
        if (type === "DEVELOPMENT") return "#2563eb";
        if (type === "BLOG") return "#ea580c";
        return "#0f766e";
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

    function dayDiff(start, end) {
        var startDate;
        var endDate;
        var diffMs;
        if (!start || !end) return null;
        startDate = new Date(String(start).slice(0, 10) + "T00:00:00");
        endDate = new Date(String(end).slice(0, 10) + "T00:00:00");
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
        diffMs = endDate.getTime() - startDate.getTime();
        return Math.round(diffMs / 86400000);
    }

    function formatDays(value) {
        if (value == null) return "-";
        if (value > 0) return "+" + formatCount(value) + "일";
        if (value < 0) return formatCount(value) + "일";
        return "0일";
    }

    function projectPeriodText(row) {
        var type = String(row.project_type_code || "GENERAL");
        if (type === "DEVELOPMENT") {
            return "목표 " + formatPeriod(row.target_start_date, row.target_end_date) + "<br>실제 " + formatPeriod(row.actual_start_date, row.actual_end_date);
        }
        return "기간 " + formatPeriod(row.project_start_date, row.project_end_date);
    }

    function projectMetricBundle(row) {
        var type = String(row.project_type_code || "GENERAL");
        var overdueCount;
        var overdueRatio;

        if (type === "BLOG") {
            return {
                main: { label: "지원금 총액", text: formatMoney(row.support_total), value: Math.max(0, number(row.support_total)) },
                sub: { label: "사용금액 총액", text: formatMoney(row.actual_total), value: Math.max(0, number(row.actual_total)) }
            };
        }

        if (type === "DEVELOPMENT") {
            overdueCount = Math.max(0, number(row.overdue_count));
            overdueRatio = number(row.task_count) > 0 ? Math.round((overdueCount / number(row.task_count)) * 100) : 0;
            return {
                main: { label: "지연 태스크 비율", text: formatPercent(overdueRatio), value: overdueRatio },
                sub: { label: "지연 태스크 건수", text: formatCount(overdueCount) + "건", value: overdueCount }
            };
        }

        return {
            main: { label: "태스크 건수", text: formatCount(row.task_count) + "건", value: Math.max(0, number(row.task_count)) },
            sub: { label: "진행률", text: formatPercent(row.progress_avg), value: Math.max(0, number(row.progress_avg)) }
        };
    }

    function monthlyMetricValue(row) {
        return monthlyMetricBundle(row).main.value;
    }

    function monthlyMainText(row) {
        return monthlyMetricBundle(row).main.text;
    }

    function monthlySubText(row) {
        return monthlyMetricBundle(row).sub.text;
    }

    function monthlyMetricBundle(row) {
        var type = String(row.project_type_code || "GENERAL");
        var overdueCount;
        var overdueRatio;
        if (type === "BLOG") {
            return {
                main: { label: "월 지원금 총액", text: formatMoney(row.support_total), value: Math.max(0, number(row.support_total)) },
                sub: { label: "월 사용금액 총액", text: formatMoney(row.actual_total), value: Math.max(0, number(row.actual_total)) }
            };
        }
        if (type === "DEVELOPMENT") {
            overdueCount = Math.max(0, number(row.overdue_count));
            overdueRatio = number(row.task_count) > 0 ? Math.round((overdueCount / number(row.task_count)) * 100) : 0;
            return {
                main: { label: "월 지연 태스크 비율", text: formatPercent(overdueRatio), value: overdueRatio },
                sub: { label: "월 지연 태스크 건수", text: formatCount(overdueCount) + "건", value: overdueCount }
            };
        }
        return {
            main: { label: "월 태스크 건수", text: formatCount(row.task_count) + "건", value: Math.max(0, number(row.task_count)) },
            sub: { label: "월 평균 진행률", text: formatPercent(row.progress_avg), value: Math.max(0, number(row.progress_avg)) }
        };
    }

    function bindInfo(targetId, rows) {
        var target = byId(targetId);
        if (!target) return;
        target.innerHTML = rows.map(function (row) {
            return "<dt>" + esc(row.label) + "</dt><dd>" + esc(row.value) + "</dd>";
        }).join("");
    }

    function setActiveTab(tabName) {
        var isProject = tabName !== "monthly";
        var projectTab = byId("tabProjectStats");
        var monthlyTab = byId("tabMonthlyStats");
        var projectView = byId("dashboardProjectView");
        var monthlyView = byId("dashboardMonthlyView");

        state.activeTab = isProject ? "project" : "monthly";

        if (projectTab) {
            projectTab.classList.toggle("is-active", isProject);
            projectTab.setAttribute("aria-selected", isProject ? "true" : "false");
        }
        if (monthlyTab) {
            monthlyTab.classList.toggle("is-active", !isProject);
            monthlyTab.setAttribute("aria-selected", isProject ? "false" : "true");
        }
        if (projectView) {
            projectView.classList.toggle("is-active", isProject);
            projectView.hidden = !isProject;
        }
        if (monthlyView) {
            monthlyView.classList.toggle("is-active", !isProject);
            monthlyView.hidden = isProject;
        }
        syncViewMode();
        renderCharts();
    }

    function setViewMode(mode) {
        var isChart = mode !== "table";
        var chartButton = byId("btnChartView");
        var tableButton = byId("btnTableView");

        state.viewMode = isChart ? "chart" : "table";

        if (chartButton) {
            chartButton.classList.toggle("is-active", isChart);
            chartButton.setAttribute("aria-selected", isChart ? "true" : "false");
        }
        if (tableButton) {
            tableButton.classList.toggle("is-active", !isChart);
            tableButton.setAttribute("aria-selected", isChart ? "false" : "true");
        }
        syncViewMode();
        renderCharts();
    }

    function syncViewMode() {
        var showChart = state.viewMode === "chart";
        var projectChart = byId("projectChartStats");
        var projectTable = byId("projectTableWrap");
        var monthlyChart = byId("monthlyChartStats");
        var monthlyTable = byId("monthlyTableWrap");

        if (projectChart) {
            projectChart.classList.toggle("is-active", showChart);
            projectChart.hidden = !showChart;
        }
        if (projectTable) {
            projectTable.classList.toggle("is-active", !showChart);
            projectTable.hidden = showChart;
        }
        if (monthlyChart) {
            monthlyChart.classList.toggle("is-active", showChart);
            monthlyChart.hidden = !showChart;
        }
        if (monthlyTable) {
            monthlyTable.classList.toggle("is-active", !showChart);
            monthlyTable.hidden = showChart;
        }
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

    function ratio(value, maxValue) {
        if (!maxValue || maxValue <= 0) return 0;
        return Math.max(0, Math.min(100, Math.round((value / maxValue) * 100)));
    }

    function budgetChartHtml(row, metric) {
        var support = Math.max(0, number(row.support_total));
        var actual = Math.max(0, number(row.actual_total));
        var maxBudget = Math.max(support, actual, 1);
        return "<div class=\"project-visual budget-visual\">"
            + "<div class=\"budget-bar-group\">"
            + "<div class=\"budget-bar-head\"><span>" + esc(metric.main.label) + "</span><strong>" + esc(metric.main.text) + "</strong></div>"
            + "<div class=\"budget-track\"><span class=\"budget-fill is-support\" style=\"width:" + esc(ratio(support, maxBudget)) + "%\"></span></div>"
            + "</div>"
            + "<div class=\"budget-bar-group\">"
            + "<div class=\"budget-bar-head\"><span>" + esc(metric.sub.label) + "</span><strong>" + esc(metric.sub.text) + "</strong></div>"
            + "<div class=\"budget-track\"><span class=\"budget-fill is-actual\" style=\"width:" + esc(ratio(actual, maxBudget)) + "%\"></span></div>"
            + "</div>"
            + "<div class=\"project-visual-meta\">"
            + "<span>잔액 " + esc(formatMoney(support - actual)) + "</span>"
            + "<span>태스크 " + esc(formatCount(row.task_count)) + "건</span>"
            + "</div>"
            + "</div>";
    }

    function timelineSegment(start, end, minStart, maxEnd) {
        var total = dayDiff(minStart, maxEnd);
        var offset = dayDiff(minStart, start);
        var duration = dayDiff(start, end);
        if (total == null || total <= 0 || offset == null || duration == null) {
            return { left: 0, width: 0 };
        }
        return {
            left: Math.max(0, Math.min(100, (offset / total) * 100)),
            width: Math.max(8, Math.min(100, (duration / total) * 100))
        };
    }

    function devTimelineHtml(row, metric) {
        var delayRatio = Math.max(0, Math.min(100, number(metric.main.value)));
        var safeTaskCount = Math.max(0, number(row.task_count));
        var onTrackCount = Math.max(0, safeTaskCount - number(row.overdue_count));
        return "<div class=\"project-visual dev-visual\">"
            + "<div class=\"general-progress-head\">"
            + "<div><span>" + esc(metric.main.label) + "</span><strong>" + esc(metric.main.text) + "</strong></div>"
            + "<div class=\"progress-ring is-delay\"><span>" + esc(delayRatio) + "%</span></div>"
            + "</div>"
            + "<div class=\"general-progress-track is-delay\"><span class=\"general-progress-fill is-delay\" style=\"width:" + esc(delayRatio) + "%\"></span></div>"
            + "<div class=\"project-visual-stats\">"
            + "<article><span>전체 태스크</span><strong>" + esc(formatCount(safeTaskCount)) + "</strong></article>"
            + "<article><span>지연 태스크</span><strong>" + esc(formatCount(row.overdue_count)) + "</strong></article>"
            + "<article><span>정상 태스크</span><strong>" + esc(formatCount(onTrackCount)) + "</strong></article>"
            + "</div>"
            + "<div class=\"project-visual-meta\">"
            + "<span>" + esc(metric.sub.label) + " " + esc(metric.sub.text) + "</span>"
            + "<span>완료 " + esc(formatCount(row.done_count)) + "건</span>"
            + "</div>"
            + "</div>";
    }

    function generalProgressHtml(row, metric) {
        var progress = Math.max(0, Math.min(100, Math.round(number(row.progress_avg))));
        var remaining = Math.max(0, number(row.task_count) - number(row.done_count));
        return "<div class=\"project-visual general-visual\">"
            + "<div class=\"general-progress-head\">"
            + "<div><span>" + esc(metric.sub.label) + "</span><strong>" + esc(metric.sub.text) + "</strong></div>"
            + "<div class=\"progress-ring\"><span>" + esc(progress) + "%</span></div>"
            + "</div>"
            + "<div class=\"general-progress-track\"><span class=\"general-progress-fill\" style=\"width:" + esc(progress) + "%\"></span></div>"
            + "<div class=\"project-visual-stats\">"
            + "<article><span>전체</span><strong>" + esc(formatCount(row.task_count)) + "</strong></article>"
            + "<article><span>완료</span><strong>" + esc(formatCount(row.done_count)) + "</strong></article>"
            + "<article><span>잔여</span><strong>" + esc(formatCount(remaining)) + "</strong></article>"
            + "</div>"
            + "</div>";
    }

    function projectVisualHtml(row, metric) {
        var type = String(row.project_type_code || "GENERAL");
        if (type === "BLOG") return budgetChartHtml(row, metric);
        if (type === "DEVELOPMENT") return devTimelineHtml(row, metric);
        return generalProgressHtml(row, metric);
    }

    function renderProjectCharts() {
        var target = byId("projectChartStats");
        if (!target) return;
        if (!state.projectStats.length) {
            target.innerHTML = "<div class=\"detail-empty\">프로젝트 데이터가 없습니다.</div>";
            return;
        }
        target.innerHTML = state.projectStats.map(function (row) {
            var type = String(row.project_type_code || "GENERAL");
            var metric = projectMetricBundle(row);
            return "<article class=\"dashboard-project-card type-" + esc(type.toLowerCase()) + "\">"
                + "<div class=\"dashboard-card-head\">"
                + "<div><strong>" + esc(row.project_name || "-") + "</strong><span>" + esc(row.project_key || "-") + "</span></div>"
                + "<em>" + esc(typeLabel(type)) + "</em>"
                + "</div>"
                + "<div class=\"dashboard-mini-chart-head\">"
                + "<div><strong>" + esc(metric.main.label) + "</strong><p>" + esc(metric.main.text) + "</p></div>"
                + "<div class=\"dashboard-mini-summary\">"
                + "<span>" + esc(metric.sub.label) + " " + esc(metric.sub.text) + "</span>"
                + "<span>태스크 " + esc(formatCount(row.task_count)) + "건</span>"
                + "</div>"
                + "</div>"
                + projectVisualHtml(row, metric)
                + "<div class=\"dashboard-project-notes\">"
                + "<div class=\"dashboard-project-note\"><span>" + esc(metric.main.label) + "</span><strong>" + esc(metric.main.text) + "</strong></div>"
                + "<div class=\"dashboard-project-note\"><span>" + esc(metric.sub.label) + "</span><strong>" + esc(metric.sub.text) + "</strong></div>"
                + "<div class=\"dashboard-project-note is-period\"><span>기간</span><strong>" + projectPeriodText(row) + "</strong></div>"
                + "</div>"
                + "</article>";
        }).join("");
    }

    function setupCanvas(canvas, fallbackWidth, fallbackHeight) {
        var ratio;
        var rect;
        var width;
        var height;
        var ctx;
        if (!canvas) return null;
        ratio = global.devicePixelRatio || 1;
        rect = canvas.parentNode ? canvas.parentNode.getBoundingClientRect() : null;
        width = Math.max(320, Math.round((rect && rect.width) || fallbackWidth));
        height = fallbackHeight;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        ctx = canvas.getContext("2d");
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        return { ctx: ctx, width: width, height: height };
    }

    function niceMax(maxValue) {
        var exponent;
        var fraction;
        var niceFraction;
        if (maxValue <= 0) return 10;
        exponent = Math.floor(Math.log(maxValue) / Math.log(10));
        fraction = maxValue / Math.pow(10, exponent);
        if (fraction <= 1) niceFraction = 1;
        else if (fraction <= 2) niceFraction = 2;
        else if (fraction <= 5) niceFraction = 5;
        else niceFraction = 10;
        return niceFraction * Math.pow(10, exponent);
    }

    function drawRoundedBar(ctx, x, y, width, height, radius, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        ctx.fill();
    }

    function monthlySectionHtml(typeCode, rows) {
        var maxMain = Math.max.apply(null, rows.map(function (row) { return monthlyMetricBundle(row).main.value; }).concat([1]));
        var maxSub = Math.max.apply(null, rows.map(function (row) { return monthlyMetricBundle(row).sub.value; }).concat([1]));
        return "<section class=\"monthly-type-section type-" + esc(typeCode.toLowerCase()) + "\">"
            + "<div class=\"monthly-type-head\"><strong>" + esc(typeLabel(typeCode)) + "</strong><p>" + esc(rows.length) + "개월 집계</p></div>"
            + rows.map(function (row) {
                var metric = monthlyMetricBundle(row);
                return "<article class=\"monthly-type-card\">"
                    + "<div class=\"monthly-type-card-head\"><strong>" + esc(row.month_key || "-") + "</strong><span>" + esc(typeLabel(typeCode)) + "</span></div>"
                    + "<div class=\"monthly-metric-block\">"
                    + "<div class=\"monthly-metric-head\"><span>" + esc(metric.main.label) + "</span><strong>" + esc(metric.main.text) + "</strong></div>"
                    + "<div class=\"monthly-metric-track\"><span class=\"monthly-metric-fill\" style=\"width:" + esc(ratio(metric.main.value, maxMain)) + "%;background:" + esc(typeColor(typeCode)) + "\"></span></div>"
                    + "</div>"
                    + "<div class=\"monthly-metric-block is-sub\">"
                    + "<div class=\"monthly-metric-head\"><span>" + esc(metric.sub.label) + "</span><strong>" + esc(metric.sub.text) + "</strong></div>"
                    + "<div class=\"monthly-metric-track\"><span class=\"monthly-metric-fill is-sub\" style=\"width:" + esc(ratio(metric.sub.value, maxSub)) + "%\"></span></div>"
                    + "</div>"
                    + "<div class=\"project-visual-meta\">"
                    + "<span>태스크 " + esc(formatCount(row.task_count)) + "건</span>"
                    + "<span>완료 " + esc(formatCount(row.done_count)) + "건</span>"
                    + "</div>"
                    + "</article>";
            }).join("")
            + "</section>";
    }

    function renderMonthlyChart() {
        var target = byId("monthlyChartStats");
        var groups;
        if (!target) return;
        if (!state.monthlyStats.length) {
            target.innerHTML = "<div class=\"detail-empty\">월별 데이터가 없습니다.</div>";
            return;
        }
        groups = {
            BLOG: state.monthlyStats.filter(function (row) { return String(row.project_type_code) === "BLOG"; }),
            DEVELOPMENT: state.monthlyStats.filter(function (row) { return String(row.project_type_code) === "DEVELOPMENT"; }),
            GENERAL: state.monthlyStats.filter(function (row) { return String(row.project_type_code) === "GENERAL"; })
        };
        target.innerHTML = "<div class=\"monthly-type-layout\">"
            + (groups.BLOG.length ? monthlySectionHtml("BLOG", groups.BLOG) : "")
            + (groups.DEVELOPMENT.length ? monthlySectionHtml("DEVELOPMENT", groups.DEVELOPMENT) : "")
            + (groups.GENERAL.length ? monthlySectionHtml("GENERAL", groups.GENERAL) : "")
            + "</div>";
    }

    function renderCharts() {
        if (state.viewMode !== "chart") return;
        if (state.activeTab === "project") {
            renderProjectCharts();
            return;
        }
        renderMonthlyChart();
    }

    function renderProjectTable() {
        var tableTarget = byId("projectStatsTable");
        if (!tableTarget) return;
        if (!state.projectStats.length) {
            tableTarget.innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">프로젝트 데이터가 없습니다.</td></tr>";
            return;
        }
        tableTarget.innerHTML = state.projectStats.map(function (row) {
            var type = String(row.project_type_code || "GENERAL");
            var metric = projectMetricBundle(row);
            return "<tr>"
                + "<td><strong>" + esc(row.project_name || "-") + "</strong><div class=\"row-sub\">" + esc(row.project_key || "-") + "</div></td>"
                + "<td>" + esc(typeLabel(type)) + "</td>"
                + "<td>" + esc(metric.main.text) + "</td>"
                + "<td>" + esc(metric.sub.text) + "</td>"
                + "<td>" + esc(formatCount(row.task_count)) + "건</td>"
                + "<td>" + projectPeriodText(row) + "</td>"
                + "</tr>";
        }).join("");
    }

    function renderMonthlyTable() {
        var tableTarget = byId("monthlyStats");
        if (!tableTarget) return;
        if (!state.monthlyStats.length) {
            tableTarget.innerHTML = "<tr><td colspan=\"5\" class=\"empty-row\">월별 데이터가 없습니다.</td></tr>";
            return;
        }
        tableTarget.innerHTML = state.monthlyStats.map(function (row) {
            var metric = monthlyMetricBundle(row);
            return "<tr>"
                + "<td>" + esc(row.month_key || "-") + "</td>"
                + "<td>" + esc(typeLabel(String(row.project_type_code || "GENERAL"))) + "</td>"
                + "<td>" + esc(formatCount(row.task_count)) + "건</td>"
                + "<td>" + esc(metric.main.label + " " + metric.main.text) + "</td>"
                + "<td>" + esc(metric.sub.label + " " + metric.sub.text) + "</td>"
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
            renderProjectTable();
            renderMonthlyTable();
            renderCharts();
            syncViewMode();
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
        UX.bindOnce(byId("tabProjectStats"), "click", function () { setActiveTab("project"); });
        UX.bindOnce(byId("tabMonthlyStats"), "click", function () { setActiveTab("monthly"); });
        UX.bindOnce(byId("btnChartView"), "click", function () { setViewMode("chart"); });
        UX.bindOnce(byId("btnTableView"), "click", function () { setViewMode("table"); });
        UX.bindOnce(byId("btnSidebarToggle"), "click", function () { setSidebarOpen(!state.sidebarOpen); });
        UX.bindOnce(byId("filterType"), "change", loadDashboard);
        global.addEventListener("resize", function () {
            syncSidebarMode();
            renderCharts();
        });
    }

    bindEvents();
    setActiveTab(state.activeTab);
    setViewMode(state.viewMode);
    syncSidebarMode();
    loadDashboard();
})(window);
