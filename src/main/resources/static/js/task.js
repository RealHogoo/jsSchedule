(function (global) {
    "use strict";

    var UX = global.UX;
    var state = {
        projects: [],
        tasks: [],
        sidebarOpen: false,
        selectedProjectId: "",
        currentUser: {}
    };

    function redirectToLogin() {
        global.location.href = "/";
    }

    function queryParam(name) {
        return new URLSearchParams(global.location.search).get(name);
    }

    function bindInfo(targetId, rows) {
        var target = UX.byId(targetId);
        if (!target) return;
        target.innerHTML = rows.map(function (row) {
            return "<dt>" + UX.esc(row.label) + "</dt><dd>" + UX.esc(row.value) + "</dd>";
        }).join("");
    }

    function renderSummary(summary) {
        var target = UX.byId("summaryCards");
        if (!target) return;

        var cards = [
            { label: "전체 프로젝트", value: summary.project_total || 0 },
            { label: "전체 태스크", value: summary.task_total || 0 },
            { label: "완료 태스크", value: summary.task_done || 0 },
            { label: "지연 태스크", value: summary.task_overdue || 0 }
        ];

        target.innerHTML = cards.map(function (card) {
            return "<article class=\"summary-card\">"
                + "<span>" + UX.esc(card.label) + "</span>"
                + "<strong>" + UX.esc(String(card.value)) + "</strong>"
                + "</article>";
        }).join("");
    }

    function isMobileViewport() {
        return global.matchMedia && global.matchMedia("(max-width: 768px)").matches;
    }

    function setSidebarOpen(open) {
        var sidebar = UX.byId("workspaceSidebar");
        var toggle = UX.byId("btnSidebarToggle");
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

    function setActionMessage(text, type) {
        var target = UX.byId("taskActionMsg");
        if (!target) return;
        target.textContent = text || "";
        target.className = "form-msg" + (type ? " is-" + type : "");
    }

    function selectedProject() {
        return state.projects.filter(function (project) {
            return String(project.project_id) === String(state.selectedProjectId);
        })[0] || null;
    }

    function syncSelectionBar() {
        var project = selectedProject();
        UX.setText(UX.byId("selectedProjectName"), project ? (project.project_name || "-") : "선택된 프로젝트 없음");
    }

    function readProjectFilters() {
        return {
            keyword: UX.byId("filterProjectKeyword").value.trim(),
            project_status: UX.byId("filterProjectStatus").value,
            owner_user_id: UX.byId("filterProjectOwner").value.trim()
        };
    }

    function formatPeriod(startDate, dueDate) {
        return (startDate ? String(startDate) : "-") + " ~ " + (dueDate ? String(dueDate) : "-");
    }

    function formatProgress(progressRate) {
        var value = Number(progressRate || 0);
        if (isNaN(value)) value = 0;
        return value.toFixed(0) + "%";
    }

    function renderProjectTable() {
        var target = UX.byId("taskProjectRows");
        if (!target) return;

        if (!state.projects.length) {
            target.innerHTML = "<tr><td colspan=\"5\" class=\"empty-row\">조회된 프로젝트가 없습니다.</td></tr>";
            syncSelectionBar();
            return;
        }

        target.innerHTML = state.projects.map(function (project) {
            var projectId = String(project.project_id || "");
            var isSelected = projectId === String(state.selectedProjectId);
            return "<tr class=\"" + (isSelected ? "is-selected" : "") + "\" data-project-id=\"" + UX.esc(projectId) + "\">"
                + "<td><span class=\"row-title\">" + UX.esc(project.project_name || "-") + "</span><span class=\"row-sub\">" + UX.esc(project.project_key || "-") + "</span></td>"
                + "<td><span class=\"status-chip status-" + UX.esc(String(project.project_status || "").toLowerCase()) + "\">" + UX.esc(project.project_status || "-") + "</span></td>"
                + "<td>" + UX.esc((project.owner_user_nm || project.owner_user_id || "-") + (project.owner_user_id ? ("(" + project.owner_user_id + ")") : "")) + "</td>"
                + "<td>" + UX.esc((project.start_date || "-") + " ~ " + (project.end_date || "-")) + "</td>"
                + "<td>" + UX.esc(String(project.task_count || 0)) + "</td>"
                + "</tr>";
        }).join("");

        UX.qsa("#taskProjectRows tr").forEach(function (row) {
            UX.bindOnce(row, "click", function () {
                state.selectedProjectId = row.getAttribute("data-project-id") || "";
                renderProjectTable();
                syncSelectionBar();
                setActionMessage("", "");
                loadTaskList();
            });
        });
    }

    function renderTaskTable() {
        var target = UX.byId("taskRows");
        if (!target) return;

        if (!state.selectedProjectId) {
            target.innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">프로젝트를 선택하면 일정 목록이 표시됩니다.</td></tr>";
            return;
        }

        if (!state.tasks.length) {
            target.innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">선택된 프로젝트의 일정이 없습니다.</td></tr>";
            return;
        }

        target.innerHTML = state.tasks.map(function (task) {
            var taskId = String(task.task_id || "");
            return "<tr>"
                + "<td><a class=\"row-link\" href=\"/task-form.html?task_id=" + UX.esc(encodeURIComponent(taskId)) + "&project_id=" + UX.esc(encodeURIComponent(String(task.project_id || state.selectedProjectId))) + "\"><span class=\"row-title\">" + UX.esc(task.task_title || "-") + "</span><span class=\"row-sub\">" + UX.esc(task.milestone_name || "-") + "</span></a></td>"
                + "<td><span class=\"status-chip status-" + UX.esc(String(task.task_status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")) + "\">" + UX.esc(task.task_status || "-") + "</span></td>"
                + "<td><span class=\"status-chip priority-" + UX.esc(String(task.priority || "").toLowerCase()) + "\">" + UX.esc(task.priority || "-") + "</span></td>"
                + "<td>" + UX.esc(task.assignee_user_id || "-") + "</td>"
                + "<td>" + UX.esc(formatPeriod(task.start_date, task.due_date)) + "</td>"
                + "<td>" + UX.esc(formatProgress(task.progress_rate)) + "</td>"
                + "</tr>";
        }).join("");
    }

    function openProject() {
        if (!state.selectedProjectId) {
            setActionMessage("프로젝트를 먼저 선택하세요.", "error");
            return;
        }
        global.location.href = "/project-form.html?project_id=" + encodeURIComponent(state.selectedProjectId);
    }

    function openTaskForm() {
        if (!state.selectedProjectId) {
            setActionMessage("프로젝트를 먼저 선택하세요.", "error");
            return;
        }
        global.location.href = "/task-form.html?project_id=" + encodeURIComponent(state.selectedProjectId);
    }

    function loadProjectList() {
        UX.byId("taskProjectRows").innerHTML = "<tr><td colspan=\"5\" class=\"empty-row\">프로젝트를 조회하는 중입니다.</td></tr>";
        return UX.requestJson("/project/list.json", readProjectFilters()).then(function (response) {
            if (!response || response.ok !== true) {
                redirectToLogin();
                return;
            }
            state.projects = Array.isArray(response.data) ? response.data : [];
            if (state.selectedProjectId) {
                var exists = state.projects.some(function (project) {
                    return String(project.project_id) === String(state.selectedProjectId);
                });
                if (!exists) {
                    state.selectedProjectId = "";
                }
            }
            renderProjectTable();
            syncSelectionBar();
            loadTaskList();
        }).catch(function () {
            redirectToLogin();
        });
    }

    function loadTaskList() {
        var target = UX.byId("taskRows");
        if (!target) return Promise.resolve();

        if (!state.selectedProjectId) {
            state.tasks = [];
            renderTaskTable();
            return Promise.resolve();
        }

        target.innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">일정 목록을 불러오는 중입니다.</td></tr>";
        return UX.requestJson("/task/list.json", { project_id: state.selectedProjectId }).then(function (response) {
            if (!response || response.ok !== true) {
                state.tasks = [];
                target.innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">일정 목록을 불러오지 못했습니다.</td></tr>";
                return;
            }
            state.tasks = Array.isArray(response.data) ? response.data : [];
            renderTaskTable();
        }).catch(function () {
            state.tasks = [];
            target.innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">일정 목록을 불러오지 못했습니다.</td></tr>";
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
        UX.byId("filterProjectKeyword").value = "";
        UX.byId("filterProjectStatus").value = "";
        UX.byId("filterProjectOwner").value = "";
        state.selectedProjectId = "";
        state.tasks = [];
        syncSelectionBar();
        setActionMessage("", "");
        loadProjectList();
    }

    function logout() {
        UX.requestJson("/logout.json", {}).finally(function () {
            UX.localRemove(["JWT", "REFRESH_TOKEN", "LOGIN_USER", "LOGIN_SESSION_ID"]);
            redirectToLogin();
        });
    }

    function bindEvents() {
        UX.bindOnce(UX.byId("btnSearchProject"), "click", loadProjectList);
        UX.bindOnce(UX.byId("btnResetProject"), "click", resetFilters);
        UX.bindOnce(UX.byId("btnReload"), "click", function () {
            loadContext().then(loadProjectList);
        });
        UX.bindOnce(UX.byId("btnLogout"), "click", logout);
        UX.bindOnce(UX.byId("btnOpenProject"), "click", openProject);
        UX.bindOnce(UX.byId("btnNewTask"), "click", openTaskForm);
        UX.bindOnce(UX.byId("btnSidebarToggle"), "click", function () {
            setSidebarOpen(!state.sidebarOpen);
        });

        ["filterProjectKeyword", "filterProjectOwner"].forEach(function (id) {
            UX.bindOnce(UX.byId(id), "keydown", function (event) {
                if (event.key === "Enter") {
                    loadProjectList();
                }
            });
        });

        UX.bindOnce(UX.byId("filterProjectStatus"), "change", loadProjectList);
        global.addEventListener("resize", syncSidebarMode);
    }

    state.selectedProjectId = queryParam("project_id") || "";
    bindEvents();
    syncSidebarMode();
    loadContext().then(loadProjectList);
})(window);
