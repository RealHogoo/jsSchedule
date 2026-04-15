(function (global) {
    "use strict";

    var UX = global.UX;
    var state = {
        sidebarOpen: false,
        currentUser: {},
        tasks: [],
        currentMonth: startOfMonth(new Date()),
        selectedDate: toDateKey(new Date())
    };

    function byId(id) { return UX.byId(id); }
    function esc(value) { return UX.esc(value == null ? "" : String(value)); }
    function redirectToLogin() { global.location.href = "/"; }
    function pad(value) { return String(value).padStart(2, "0"); }
    function toDateKey(date) { return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()); }

    function parseDate(value) {
        var parts;
        if (!value) return null;
        parts = String(value).slice(0, 10).split("-");
        if (parts.length !== 3) return null;
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }

    function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
    function addMonths(date, amount) { return new Date(date.getFullYear(), date.getMonth() + amount, 1); }
    function addDays(date, amount) {
        var result = new Date(date);
        result.setDate(result.getDate() + amount);
        return result;
    }

    function endOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }

    function formatMonth(date) { return date.getFullYear() + "." + pad(date.getMonth() + 1); }

    function formatDateLabel(dateKey) {
        var date = parseDate(dateKey);
        return date ? date.getFullYear() + "." + pad(date.getMonth() + 1) + "." + pad(date.getDate()) : "-";
    }

    function formatDayLabel(date) {
        return pad(date.getMonth() + 1) + "." + pad(date.getDate());
    }

    function formatPeriod(startDate, dueDate) { return (startDate || "-") + " ~ " + (dueDate || "-"); }

    function setMessage(text, type) {
        var target = byId("taskActionMsg");
        if (!target) return;
        target.textContent = text || "";
        target.className = "form-msg" + (type ? " is-" + type : "");
    }

    function showWarningModal(message) {
        UX.showAlertModal({ title: "알림", message: message });
    }

    function taskDateRange(task) {
        var start = parseDate(task.start_date) || parseDate(task.due_date);
        var end = parseDate(task.due_date) || parseDate(task.start_date);
        if (start && end && start > end) return { start: end, end: start };
        return { start: start, end: end };
    }

    function taskContainsDate(task, dateKey) {
        var range = taskDateRange(task);
        var date = parseDate(dateKey);
        if (!range.start || !range.end || !date) return false;
        return date >= range.start && date <= range.end;
    }

    function tasksForDate(dateKey) {
        return state.tasks.filter(function (task) {
            return taskContainsDate(task, dateKey);
        }).sort(function (a, b) {
            return String(a.due_date || "9999-12-31").localeCompare(String(b.due_date || "9999-12-31"));
        });
    }

    function getMonthDates(month) {
        var first = startOfMonth(month);
        var last = endOfMonth(month);
        var dates = [];
        var cursor = new Date(first);
        while (cursor <= last) {
            dates.push(new Date(cursor));
            cursor = addDays(cursor, 1);
        }
        return dates;
    }

    function getMonthSeries() {
        return getMonthDates(state.currentMonth).map(function (date) {
            var dateKey = toDateKey(date);
            var items = tasksForDate(dateKey);
            return {
                date: date,
                dateKey: dateKey,
                count: items.length,
                items: items
            };
        });
    }

    function ensureSelectedDateInMonth() {
        var month = state.currentMonth;
        var selected = parseDate(state.selectedDate);
        if (!selected || selected.getFullYear() !== month.getFullYear() || selected.getMonth() !== month.getMonth()) {
            state.selectedDate = toDateKey(startOfMonth(month));
        }
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
            { label: "지연", value: summary.task_overdue || 0 }
        ];
        target.innerHTML = cards.map(function (card) {
            return "<article class=\"summary-card\"><span>" + esc(card.label) + "</span><strong>" + esc(String(card.value)) + "</strong></article>";
        }).join("");
    }

    function renderSelectedDateTasks() {
        var title = byId("selectedDateTitle");
        var target = byId("selectedDateTasks");
        var items = tasksForDate(state.selectedDate);
        if (!target) return;
        UX.setText(title, formatDateLabel(state.selectedDate) + " / 태스크 " + items.length);
        if (!items.length) {
            target.innerHTML = "<div class=\"detail-empty\">태스크가 없습니다.</div>";
            return;
        }
        target.innerHTML = items.map(function (task) {
            return "<article class=\"day-task-card\">"
                + "<div class=\"day-task-head\"><strong>" + esc(task.task_title || "-") + "</strong>"
                + "<span class=\"status-chip status-" + esc(String(task.task_status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")) + "\">" + esc(task.task_status || "-") + "</span></div>"
                + "<p>" + esc(task.project_name || "-") + "</p>"
                + "<div class=\"day-task-meta\"><span>" + esc(formatPeriod(task.start_date, task.due_date)) + "</span><span>" + esc(task.priority || "-") + "</span></div>"
                + "<button type=\"button\" class=\"btn open-task-manage\" data-project-id=\"" + esc(task.project_id || "") + "\" data-task-id=\"" + esc(task.task_id || "") + "\">태스크 열기</button>"
                + "</article>";
        }).join("");
        UX.qsa(".open-task-manage", target).forEach(function (button) {
            UX.bindOnce(button, "click", function () {
                var projectId = button.getAttribute("data-project-id");
                var taskId = button.getAttribute("data-task-id");
                if (!projectId) return;
                global.location.href = "/task-form.html?project_id=" + encodeURIComponent(projectId)
                    + (taskId ? "&task_id=" + encodeURIComponent(taskId) : "");
            });
        });
    }

    function renderMonthLineChart() {
        var target = byId("calendarChart");
        var rail = byId("calendarDayRail");
        var meta = byId("calendarChartMeta");
        var series = getMonthSeries();
        var selectedIndex = 0;
        var chartWidth = Math.max(680, series.length * 26);
        var chartHeight = 320;
        var padding = { top: 24, right: 24, bottom: 42, left: 44 };
        var innerWidth = chartWidth - padding.left - padding.right;
        var innerHeight = chartHeight - padding.top - padding.bottom;
        var maxCount = Math.max.apply(null, series.map(function (entry) { return entry.count; }).concat([1]));
        var points;
        var xStep;
        var polyline;
        var selectedEntry;
        var labels;
        var grid;

        if (!target || !rail || !meta) return;

        ensureSelectedDateInMonth();
        selectedIndex = Math.max(0, series.findIndex(function (entry) { return entry.dateKey === state.selectedDate; }));
        selectedEntry = series[selectedIndex] || series[0];
        xStep = series.length > 1 ? innerWidth / (series.length - 1) : innerWidth;

        points = series.map(function (entry, index) {
            var x = padding.left + (xStep * index);
            var y = padding.top + innerHeight - ((entry.count / maxCount) * innerHeight);
            return {
                x: x,
                y: y,
                count: entry.count,
                dateKey: entry.dateKey,
                label: formatDayLabel(entry.date)
            };
        });

        polyline = points.map(function (point) {
            return point.x.toFixed(2) + "," + point.y.toFixed(2);
        }).join(" ");

        grid = [];
        for (var tick = 0; tick <= 4; tick++) {
            var value = Math.round((maxCount / 4) * tick);
            var y = padding.top + innerHeight - ((value / maxCount) * innerHeight);
            grid.push("<line x1=\"" + padding.left + "\" y1=\"" + y.toFixed(2) + "\" x2=\"" + (chartWidth - padding.right) + "\" y2=\"" + y.toFixed(2) + "\" class=\"calendar-chart-grid-line\"></line>");
            grid.push("<text x=\"" + (padding.left - 10) + "\" y=\"" + (y + 4).toFixed(2) + "\" class=\"calendar-chart-axis-text\" text-anchor=\"end\">" + esc(String(value)) + "</text>");
        }

        labels = points.filter(function (_, index) {
            return index === 0 || index === points.length - 1 || index % 4 === 0;
        }).map(function (point) {
            return "<text x=\"" + point.x.toFixed(2) + "\" y=\"" + (chartHeight - 14) + "\" class=\"calendar-chart-axis-text\" text-anchor=\"middle\">" + esc(point.label) + "</text>";
        }).join("");

        target.innerHTML = "<div class=\"calendar-chart-scroll\">"
            + "<svg viewBox=\"0 0 " + chartWidth + " " + chartHeight + "\" class=\"calendar-chart-svg\" role=\"img\" aria-label=\"monthly task trend chart\">"
            + "<defs>"
            + "<linearGradient id=\"calendarAreaFill\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">"
            + "<stop offset=\"0%\" stop-color=\"#0f766e\" stop-opacity=\"0.28\"></stop>"
            + "<stop offset=\"100%\" stop-color=\"#0f766e\" stop-opacity=\"0.02\"></stop>"
            + "</linearGradient>"
            + "</defs>"
            + "<rect x=\"0\" y=\"0\" width=\"" + chartWidth + "\" height=\"" + chartHeight + "\" rx=\"20\" class=\"calendar-chart-bg\"></rect>"
            + grid.join("")
            + "<polygon points=\"" + padding.left + "," + (padding.top + innerHeight) + " " + polyline + " " + (padding.left + innerWidth) + "," + (padding.top + innerHeight) + "\" class=\"calendar-chart-area\"></polygon>"
            + "<polyline points=\"" + polyline + "\" class=\"calendar-chart-line\"></polyline>"
            + points.map(function (point) {
                return "<g class=\"calendar-chart-point-group\">"
                    + "<circle cx=\"" + point.x.toFixed(2) + "\" cy=\"" + point.y.toFixed(2) + "\" r=\"" + (point.dateKey === state.selectedDate ? 7 : 5) + "\" class=\"calendar-chart-point"
                    + (point.dateKey === state.selectedDate ? " is-selected" : "")
                    + "\" data-date=\"" + esc(point.dateKey) + "\"></circle>"
                    + "</g>";
            }).join("")
            + labels
            + "</svg></div>";

        rail.innerHTML = series.map(function (entry) {
            var count = entry.count;
            return "<button type=\"button\" class=\"calendar-day-chip"
                + (entry.dateKey === state.selectedDate ? " is-selected" : "")
                + "\" data-date=\"" + esc(entry.dateKey) + "\">"
                + "<span>" + esc(formatDayLabel(entry.date)) + "</span>"
                + "<strong>" + esc(String(count)) + "</strong>"
                + "</button>";
        }).join("");

        meta.innerHTML = "<strong>" + esc(formatDateLabel(selectedEntry.dateKey)) + "</strong><span>Active tasks " + esc(String(selectedEntry.count)) + "</span>";

        UX.qsa(".calendar-chart-point", target).forEach(function (point) {
            UX.bindOnce(point, "click", function () {
                state.selectedDate = point.getAttribute("data-date");
                renderSchedule();
            });
        });

        UX.qsa(".calendar-day-chip", rail).forEach(function (button) {
            UX.bindOnce(button, "click", function () {
                state.selectedDate = button.getAttribute("data-date");
                renderSchedule();
            });
        });
    }

    function renderSchedule() {
        ensureSelectedDateInMonth();
        UX.setText(byId("calendarTitle"), formatMonth(state.currentMonth));
        renderMonthLineChart();
        renderSelectedDateTasks();
    }

    function readFilters() {
        return {
            assignee_user_id: state.currentUser.user_id || "",
            keyword: byId("filterKeyword").value.trim(),
            task_status: byId("filterStatus").value
        };
    }

    function loadTasks() {
        setMessage("불러오는 중", "info");
        return UX.requestJson("/task/list.json", readFilters()).then(function (response) {
            if (!response || response.ok !== true) {
                state.tasks = [];
                showWarningModal("불러오기 실패");
                renderSchedule();
                return;
            }
            state.tasks = Array.isArray(response.data) ? response.data : [];
            setMessage("", "");
            renderSchedule();
        }).catch(function () {
            state.tasks = [];
            showWarningModal("불러오기 실패");
            renderSchedule();
        });
    }

    function loadContext() {
        return Promise.all([
            UX.requestJson("/auth/me.json", {}),
            UX.requestJson("/dashboard/summary.json", {})
        ]).then(function (results) {
            var me = results[0];
            var dashboard = results[1];
            if (!me || me.ok !== true || !dashboard || dashboard.ok !== true) {
                redirectToLogin();
                return;
            }
            state.currentUser = me.data || {};
            bindInfo("currentUser", [
                { label: "아이디", value: state.currentUser.user_id || "-" },
                { label: "이름", value: state.currentUser.user_nm || "-" },
                { label: "권한", value: (state.currentUser.roles || []).join(", ") || "-" }
            ]);
            renderSummary((dashboard.data && dashboard.data.summary) || {});
        }).catch(function () {
            redirectToLogin();
        });
    }

    function resetFilters() {
        byId("filterKeyword").value = "";
        byId("filterStatus").value = "";
        loadTasks();
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
        UX.bindOnce(byId("btnSearch"), "click", loadTasks);
        UX.bindOnce(byId("btnReset"), "click", resetFilters);
        UX.bindOnce(byId("btnReload"), "click", function () { loadContext().then(loadTasks); });
        UX.bindOnce(byId("btnLogout"), "click", logout);
        UX.bindOnce(byId("btnPrevMonth"), "click", function () {
            state.currentMonth = addMonths(state.currentMonth, -1);
            state.selectedDate = toDateKey(startOfMonth(state.currentMonth));
            renderSchedule();
        });
        UX.bindOnce(byId("btnNextMonth"), "click", function () {
            state.currentMonth = addMonths(state.currentMonth, 1);
            state.selectedDate = toDateKey(startOfMonth(state.currentMonth));
            renderSchedule();
        });
        UX.bindOnce(byId("btnToday"), "click", function () {
            var today = new Date();
            state.currentMonth = startOfMonth(today);
            state.selectedDate = toDateKey(today);
            renderSchedule();
        });
        UX.bindOnce(byId("btnSidebarToggle"), "click", function () { setSidebarOpen(!state.sidebarOpen); });
        UX.bindOnce(byId("filterKeyword"), "keydown", function (event) {
            if (event.key === "Enter") loadTasks();
        });
        UX.bindOnce(byId("filterStatus"), "change", loadTasks);
        global.addEventListener("resize", function () {
            syncSidebarMode();
            renderSchedule();
        });
    }

    bindEvents();
    syncSidebarMode();
    renderSchedule();
    loadContext().then(loadTasks);
})(window);
