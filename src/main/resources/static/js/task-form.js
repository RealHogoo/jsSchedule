(function (global) {
    "use strict";

    var UX = global.UX;
    var state = {
        sidebarOpen: false,
        currentUser: {},
        taskId: null,
        projectId: null,
        projects: []
    };

    function backToList() {
        if (state.projectId) {
            global.location.href = "/task.html?project_id=" + encodeURIComponent(state.projectId);
            return;
        }
        global.location.href = "/task.html";
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
            return "<article class=\"summary-card\"><span>" + UX.esc(card.label) + "</span><strong>" + UX.esc(String(card.value)) + "</strong></article>";
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

    function setFormMessage(text, type) {
        var target = UX.byId("taskFormMsg");
        if (!target) return;
        target.textContent = text || "";
        target.className = "form-msg" + (type ? " is-" + type : "");
    }

    function apiMessage(response, fallback) {
        if (response && response.code && response.message) {
            return "[" + response.code + "] " + response.message;
        }
        if (response && response.message) {
            return response.message;
        }
        return fallback;
    }

    function userLabel(userNm, userId) {
        if (!userNm && !userId) return "";
        if (!userNm) return userId;
        if (!userId) return userNm;
        return userNm + "(" + userId + ")";
    }

    function selectedProject() {
        return state.projects.filter(function (project) {
            return String(project.project_id) === String(state.projectId);
        })[0] || null;
    }

    function renderProjectField() {
        var project = selectedProject();
        UX.byId("taskProjectId").value = state.projectId || "";
        UX.byId("taskProjectName").value = project ? String(project.project_name || "-") : "";
    }

    function renderAssignee(userId, userNm) {
        UX.byId("taskAssigneeUserId").value = userId || "";
        UX.byId("taskAssigneeDisplay").value = userLabel(userNm || "", userId || "");
    }

    function toggleAssigneeModal(open) {
        var modal = UX.byId("assigneeModal");
        if (!modal) return;
        modal.hidden = !open;
        if (open) {
            UX.byId("assigneeKeyword").focus();
        }
    }

    function renderAssigneeList(items) {
        var target = UX.byId("assigneeList");
        if (!target) return;
        if (!items || !items.length) {
            target.innerHTML = "<div class=\"detail-empty\">조회된 사용자가 없습니다.</div>";
            return;
        }

        target.innerHTML = items.map(function (item) {
            var userId = item.user_id || "";
            var userNm = item.user_nm || "";
            var label = item.label || userLabel(userNm, userId);
            return "<button type=\"button\" class=\"manager-option\" data-user-id=\"" + UX.esc(userId) + "\" data-user-nm=\"" + UX.esc(userNm) + "\">"
                + "<strong>" + UX.esc(label) + "</strong>"
                + "<span>" + UX.esc(userNm) + "</span>"
                + "</button>";
        }).join("");

        UX.qsa(".manager-option", target).forEach(function (button) {
            UX.bindOnce(button, "click", function () {
                renderAssignee(button.getAttribute("data-user-id") || "", button.getAttribute("data-user-nm") || "");
                toggleAssigneeModal(false);
            });
        });
    }

    function loadAssigneeOptions() {
        var keyword = UX.byId("assigneeKeyword").value.trim();
        UX.byId("assigneeList").innerHTML = "<div class=\"detail-empty\">사용자 목록을 조회하는 중입니다.</div>";
        return UX.requestJson("/project/manager-options.json", { keyword: keyword }).then(function (response) {
            if (!response || response.ok !== true) {
                UX.byId("assigneeList").innerHTML = "<div class=\"detail-empty\">[" + UX.esc(response && response.code ? response.code : "S5000") + "] 사용자 목록을 불러오지 못했습니다.</div>";
                return;
            }
            renderAssigneeList(Array.isArray(response.data) ? response.data : []);
        }).catch(function () {
            UX.byId("assigneeList").innerHTML = "<div class=\"detail-empty\">[S5000] 사용자 목록을 불러오지 못했습니다.</div>";
        });
    }

    function renderForm(task) {
        var isEdit = !!(task && task.task_id);
        var projectName = task && task.project_name ? String(task.project_name) : "";

        state.taskId = isEdit ? String(task.task_id) : null;
        state.projectId = task && task.project_id ? String(task.project_id) : (state.projectId || "");

        UX.byId("taskId").value = state.taskId || "";
        renderProjectField();
        if (projectName && !UX.byId("taskProjectName").value) {
            UX.byId("taskProjectName").value = projectName;
        }

        UX.byId("taskTitle").value = task && task.task_title ? String(task.task_title) : "";
        UX.byId("taskStatus").value = task && task.task_status ? String(task.task_status) : "TODO";
        UX.byId("taskPriority").value = task && task.priority ? String(task.priority) : "MEDIUM";
        renderAssignee(
            task && task.assignee_user_id ? String(task.assignee_user_id) : (state.currentUser.user_id || ""),
            task && task.assignee_user_nm ? String(task.assignee_user_nm) : (state.currentUser.user_nm || "")
        );
        UX.byId("taskStartDate").value = task && task.start_date ? String(task.start_date).slice(0, 10) : "";
        UX.byId("taskDueDate").value = task && task.due_date ? String(task.due_date).slice(0, 10) : "";
        UX.byId("taskProgressRate").value = task && task.progress_rate != null ? String(Math.round(Number(task.progress_rate || 0))) : "0";
        UX.byId("taskDescription").value = task && task.description ? String(task.description) : "";

        UX.setText("taskFormPageTitle", isEdit ? "태스크 수정" : "신규 태스크 등록");
        UX.byId("taskMeta").innerHTML = isEdit ? [
            "<span>태스크 ID " + UX.esc(String(task.task_id || "-")) + "</span>",
            "<span>프로젝트 " + UX.esc(String(task.project_name || "-")) + "</span>",
            "<span>마일스톤 " + UX.esc(String(task.milestone_name || "-")) + "</span>"
        ].join("") : "<span>선택한 프로젝트 기준으로 태스크를 등록합니다.</span>";

        setFormMessage("", "");
    }

    function loadTask() {
        if (!state.taskId) {
            renderForm(null);
            if (!state.projectId) {
                setFormMessage("프로젝트 선택 후 진입해야 합니다.", "error");
            }
            return Promise.resolve();
        }

        return UX.requestJson("/task/detail.json", { task_id: state.taskId }).then(function (response) {
            if (!response || response.ok !== true) {
                setFormMessage(apiMessage(response, "알 수 없는 오류가 발생했습니다. 관리자에게 문의하세요."), "error");
                return;
            }
            renderForm(response.data || null);
        }).catch(function () {
            setFormMessage("알 수 없는 오류가 발생했습니다. 관리자에게 문의하세요.", "error");
        });
    }

    function createPayload() {
        return {
            task_id: UX.byId("taskId").value.trim() || null,
            project_id: UX.byId("taskProjectId").value || null,
            task_title: UX.byId("taskTitle").value.trim(),
            task_status: UX.byId("taskStatus").value,
            priority: UX.byId("taskPriority").value,
            assignee_user_id: UX.byId("taskAssigneeUserId").value.trim(),
            start_date: UX.byId("taskStartDate").value || null,
            due_date: UX.byId("taskDueDate").value || null,
            progress_rate: UX.byId("taskProgressRate").value || 0,
            description: UX.byId("taskDescription").value.trim()
        };
    }

    function saveTask() {
        if (!state.projectId) {
            setFormMessage("프로젝트 선택 후 진입해야 합니다.", "error");
            return;
        }
        setFormMessage("", "");
        UX.requestJson("/task/save.json", createPayload()).then(function (response) {
            if (!response || response.ok !== true) {
                setFormMessage(apiMessage(response, "알 수 없는 오류가 발생했습니다. 관리자에게 문의하세요."), "error");
                return;
            }
            var task = response.data || {};
            renderForm(task);
            setFormMessage("저장되었습니다.", "success");
            if (task.task_id) {
                var nextUrl = "/task-form.html?task_id=" + encodeURIComponent(String(task.task_id));
                if (task.project_id) {
                    state.projectId = String(task.project_id);
                    nextUrl += "&project_id=" + encodeURIComponent(state.projectId);
                }
                global.history.replaceState({}, "", nextUrl);
            }
        }).catch(function () {
            setFormMessage("알 수 없는 오류가 발생했습니다. 관리자에게 문의하세요.", "error");
        });
    }

    function loadProjectOptions() {
        return UX.requestJson("/project/list.json", {}).then(function (response) {
            if (!response || response.ok !== true) {
                state.projects = [];
                renderProjectField();
                setFormMessage(apiMessage(response, "프로젝트 목록을 불러오지 못했습니다."), "error");
                return;
            }
            state.projects = Array.isArray(response.data) ? response.data : [];
            renderProjectField();
            if (!state.taskId && !selectedProject()) {
                setFormMessage("선택한 프로젝트 정보를 찾지 못했습니다.", "error");
            }
        }).catch(function () {
            state.projects = [];
            renderProjectField();
            setFormMessage("프로젝트 목록을 불러오지 못했습니다.", "error");
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
                setFormMessage(apiMessage(me, "화면 초기화 중 오류가 발생했습니다."), "error");
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
            setFormMessage("화면 초기화 중 오류가 발생했습니다.", "error");
        });
    }

    function logout() {
        UX.requestJson("/logout.json", {}).finally(function () {
            UX.localRemove(["JWT", "REFRESH_TOKEN", "LOGIN_USER", "LOGIN_SESSION_ID"]);
            global.location.href = "/";
        });
    }

    function bindEvents() {
        UX.bindOnce(UX.byId("btnSidebarToggle"), "click", function () {
            setSidebarOpen(!state.sidebarOpen);
        });
        UX.bindOnce(UX.byId("btnBackToTaskList"), "click", backToList);
        UX.bindOnce(UX.byId("btnCancelTask"), "click", backToList);
        UX.bindOnce(UX.byId("btnSaveTask"), "click", saveTask);
        UX.bindOnce(UX.byId("btnLogout"), "click", logout);
        UX.bindOnce(UX.byId("btnPickAssignee"), "click", function () {
            toggleAssigneeModal(true);
            loadAssigneeOptions();
        });
        UX.bindOnce(UX.byId("btnCloseAssigneeModal"), "click", function () {
            toggleAssigneeModal(false);
        });
        UX.bindOnce(UX.byId("btnSearchAssignee"), "click", loadAssigneeOptions);
        UX.bindOnce(UX.byId("assigneeModal"), "click", function (event) {
            if (event.target && event.target.id === "assigneeModal") {
                toggleAssigneeModal(false);
            }
        });
        UX.bindOnce(UX.byId("assigneeKeyword"), "keydown", function (event) {
            if (event.key === "Enter") {
                loadAssigneeOptions();
            }
        });
        global.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                toggleAssigneeModal(false);
            }
        });
        global.addEventListener("resize", syncSidebarMode);
    }

    state.taskId = queryParam("task_id");
    state.projectId = queryParam("project_id");
    bindEvents();
    syncSidebarMode();
    loadContext().then(loadProjectOptions).then(loadTask);
})(window);
