(function (global) {
    "use strict";

    var UX = global.UX;
    var state = {
        sidebarOpen: false,
        currentUser: {},
        tasks: []
    };

    function byId(id) { return UX.byId(id); }
    function esc(value) { return UX.esc(value == null ? "" : String(value)); }
    function redirectToLogin() { global.location.href = "/"; }

    function setMessage(text, type) {
        var target = byId("taskActionMsg");
        if (!target) return;
        target.textContent = text || "";
        target.className = "form-msg" + (type ? " is-" + type : "");
    }

    function showWarningModal(message) {
        UX.showAlertModal({
            title: "확인 필요",
            message: message
        });
    }

    function formatPeriod(startDate, dueDate) {
        return (startDate || "-") + " ~ " + (dueDate || "-");
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
        if (!target) return;

        var cards = [
            { label: "전체 프로젝트", value: summary.project_total || 0 },
            { label: "전체 태스크", value: summary.task_total || 0 },
            { label: "진행 태스크", value: summary.task_in_progress || 0 },
            { label: "지연 태스크", value: summary.task_overdue || 0 }
        ];

        target.innerHTML = cards.map(function (card) {
            return "<article class=\"summary-card\"><span>" + esc(card.label) + "</span><strong>" + esc(String(card.value)) + "</strong></article>";
        }).join("");
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

    function renderTasks() {
        var target = byId("taskRows");
        if (!target) return;

        if (!state.tasks.length) {
            target.innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">조건에 맞는 내 태스크가 없습니다.</td></tr>";
            return;
        }

        target.innerHTML = state.tasks.map(function (task) {
            return "<tr>"
                + "<td><div class=\"row-link\"><span class=\"row-title\">" + esc(task.project_name || "-") + "</span><span class=\"row-sub\">" + esc(task.project_id || "-") + "</span></div></td>"
                + "<td><div class=\"row-link\"><span class=\"row-title\">" + esc(task.task_title || "-") + "</span><span class=\"row-sub\">" + esc(task.assignee_user_id || "-") + "</span></div></td>"
                + "<td><span class=\"status-chip status-" + esc(String(task.task_status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")) + "\">" + esc(task.task_status || "-") + "</span></td>"
                + "<td><span class=\"status-chip priority-" + esc(String(task.priority || "").toLowerCase()) + "\">" + esc(task.priority || "-") + "</span></td>"
                + "<td>" + esc(formatPeriod(task.start_date, task.due_date)) + "</td>"
                + "<td><button type=\"button\" class=\"btn open-task-manage\" data-project-id=\"" + esc(task.project_id || "") + "\" data-task-id=\"" + esc(task.task_id || "") + "\">태스크 관리</button></td>"
                + "</tr>";
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

    function readFilters() {
        return {
            assignee_user_id: state.currentUser.user_id || "",
            keyword: byId("filterKeyword").value.trim(),
            task_status: byId("filterStatus").value
        };
    }

    function loadTasks() {
        byId("taskRows").innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">내 태스크를 불러오는 중입니다.</td></tr>";
        setMessage("", "");
        return UX.requestJson("/task/list.json", readFilters()).then(function (response) {
            if (!response || response.ok !== true) {
                state.tasks = [];
                showWarningModal("내 태스크를 불러오지 못했습니다.");
                renderTasks();
                return;
            }
            state.tasks = Array.isArray(response.data) ? response.data : [];
            renderTasks();
        }).catch(function () {
            state.tasks = [];
            showWarningModal("내 태스크를 불러오지 못했습니다.");
            renderTasks();
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

    function bindEvents() {
        UX.bindOnce(byId("btnSearch"), "click", loadTasks);
        UX.bindOnce(byId("btnReset"), "click", resetFilters);
        UX.bindOnce(byId("btnReload"), "click", function () {
            loadContext().then(loadTasks);
        });
        UX.bindOnce(byId("btnLogout"), "click", logout);
        UX.bindOnce(byId("btnSidebarToggle"), "click", function () {
            setSidebarOpen(!state.sidebarOpen);
        });
        UX.bindOnce(byId("filterKeyword"), "keydown", function (event) {
            if (event.key === "Enter") {
                loadTasks();
            }
        });
        UX.bindOnce(byId("filterStatus"), "change", loadTasks);
        global.addEventListener("resize", syncSidebarMode);
    }

    bindEvents();
    syncSidebarMode();
    loadContext().then(loadTasks);
})(window);
