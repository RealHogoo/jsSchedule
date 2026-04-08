(function (global) {
    "use strict";

    var UX = global.UX;
    var state = {
        sidebarOpen: false,
        currentUser: {},
        projectId: "",
        project: null,
        tasks: [],
        selectedTaskId: "",
        taskMode: "list"
    };
    var MAX_TASK_DEPTH = 3;

    function byId(id) { return UX.byId(id); }
    function queryParam(name) { return new URLSearchParams(global.location.search).get(name); }
    function redirectToLogin() { global.location.href = "/"; }
    function goToProjects() { global.location.href = "/project.html"; }
    function esc(value) { return UX.esc(value == null ? "" : String(value)); }
    function projectTypeCode() { return state.project && state.project.project_type_code ? String(state.project.project_type_code) : "GENERAL"; }
    function setHidden(element, hidden) {
        if (element) element.hidden = !!hidden;
    }

    function setMessage(targetId, text, type) {
        var target = byId(targetId);
        if (!target) return;
        target.textContent = text || "";
        target.className = "form-msg" + (type ? " is-" + type : "");
    }

    function setTaskMessage(text, type) { setMessage("taskActionMsg", text, type); }
    function setTaskFormMessage(text, type) { setMessage("taskFormMsg", text, type); }

    function apiMessage(response, fallback) {
        if (response && response.code && response.message) return "[" + response.code + "] " + response.message;
        if (response && response.message) return response.message;
        return fallback;
    }

    function formatPeriod(startDate, dueDate) {
        return (startDate || "-") + " ~ " + (dueDate || "-");
    }

    function formatProgress(progressRate) {
        var value = Number(progressRate || 0);
        if (isNaN(value)) value = 0;
        return value.toFixed(0) + "%";
    }

    function syncProgressRateLabel(value) {
        UX.setText(byId("taskProgressRateValue"), formatProgress(value));
    }

    function userLabel(userNm, userId) {
        if (!userNm && !userId) return "";
        if (!userNm) return userId;
        if (!userId) return userNm;
        return userNm + "(" + userId + ")";
    }

    function taskRelationLabel(task) {
        var parts = [];
        if (task && task.parent_task_title) parts.push("parent: " + task.parent_task_title);
        if (task && task.milestone_name) parts.push(task.milestone_name);
        return parts.join(" / ");
    }

    function compareTasks(a, b) {
        var aDue = a && a.due_date ? String(a.due_date) : "9999-12-31";
        var bDue = b && b.due_date ? String(b.due_date) : "9999-12-31";
        if (aDue < bDue) return -1;
        if (aDue > bDue) return 1;

        var aId = Number(a && a.task_id || 0);
        var bId = Number(b && b.task_id || 0);
        return bId - aId;
    }

    function buildTaskRows() {
        var byParent = {};
        var byId = {};
        var ordered = [];

        state.tasks.forEach(function (task) {
            var taskId = String(task.task_id || "");
            if (!taskId) return;
            byId[taskId] = task;
        });

        state.tasks.forEach(function (task) {
            var parentId = task && task.parent_task_id ? String(task.parent_task_id) : "";
            if (parentId && !byId[parentId]) {
                parentId = "";
            }
            if (!byParent[parentId]) {
                byParent[parentId] = [];
            }
            byParent[parentId].push(task);
        });

        Object.keys(byParent).forEach(function (key) {
            byParent[key].sort(compareTasks);
        });

        function visit(parentId, depth, trail) {
            var items = byParent[parentId] || [];
            items.forEach(function (task) {
                var taskId = String(task.task_id || "");
                if (!taskId || trail[taskId]) return;
                trail[taskId] = true;
                task._tree_depth = depth;
                ordered.push(task);
                visit(taskId, depth + 1, trail);
            });
        }

        visit("", 0, {});

        state.tasks
            .filter(function (task) {
                return ordered.indexOf(task) < 0;
            })
            .sort(compareTasks)
            .forEach(function (task) {
                task._tree_depth = 0;
                ordered.push(task);
            });

        return ordered;
    }

    function taskOptionLabel(task) {
        var depth = Number(task && task._tree_depth || 0);
        var prefix = depth > 0 ? new Array(depth + 1).join("  ") + "- " : "";
        return prefix + String(task && task.task_title || ("TASK-" + String(task && task.task_id || "")));
    }

    function canAcceptChild(task, currentTaskId) {
        if (!task) return false;
        if (Number(task._tree_depth || 0) >= MAX_TASK_DEPTH) return false;
        if (!currentTaskId) return true;
        return String(task.task_id || "") !== String(currentTaskId);
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
            { label: "완료 태스크", value: summary.task_done || 0 },
            { label: "지연 태스크", value: summary.task_overdue || 0 }
        ];

        target.innerHTML = cards.map(function (card) {
            return "<article class=\"summary-card\"><span>" + esc(card.label) + "</span><strong>" + esc(String(card.value)) + "</strong></article>";
        }).join("");
    }

    function renderProjectSummary() {
        if (!state.project) {
            UX.setText(byId("selectedProjectName"), "프로젝트를 찾을 수 없습니다.");
            byId("projectSummary").innerHTML = "<span>유효한 프로젝트가 아닙니다.</span>";
            return;
        }

        UX.setText(byId("selectedProjectName"), state.project.project_name || "-");
        byId("taskProjectId").value = state.projectId;
        byId("taskProjectName").value = state.project.project_name || "";
        byId("projectSummary").innerHTML = [
            "<span>유형 " + esc(state.project.project_type_code || "GENERAL") + "</span>",
            "<span>상태 " + esc(state.project.project_status || "-") + "</span>",
            "<span>PM " + esc(state.project.owner_user_id || "-") + "</span>",
            "<span>기간 " + esc(formatPeriod(state.project.start_date, state.project.end_date)) + "</span>",
            "<span>태스크 " + esc(String(state.project.task_count || 0)) + "</span>"
        ].join("");
    }

    function applyTaskFieldMode(task) {
        var typeCode = projectTypeCode();
        var isDevelopment = typeCode === "DEVELOPMENT";
        var isBlog = typeCode === "BLOG";
        var showProgress = !isBlog;
        var form = byId("taskForm");

        if (form) {
            form.setAttribute("data-project-type", typeCode);
        }

        UX.setText(byId("taskStartDateLabel"), isDevelopment ? "목표 시작일" : "시작일");
        UX.setText(byId("taskDueDateLabel"), isDevelopment ? "목표 종료일" : "마감일");
        setHidden(byId("taskActualDateSection"), !isDevelopment);
        setHidden(byId("taskBlogFieldSection"), !isBlog);
        setHidden(byId("taskProgressSection"), !showProgress);

        if (!isDevelopment) {
            byId("taskActualStartDate").value = "";
            byId("taskActualEndDate").value = "";
        }
        if (!isBlog) {
            byId("taskUrl").value = "";
            byId("taskSupportAmount").value = "";
            byId("taskActualAmount").value = "";
        }
        if (!showProgress) {
            byId("taskProgressRate").value = "0";
            syncProgressRateLabel("0");
        }

        if (task && task.task_id) {
            byId("taskActualStartDate").value = isDevelopment && task.actual_start_date ? String(task.actual_start_date).slice(0, 10) : "";
            byId("taskActualEndDate").value = isDevelopment && task.actual_end_date ? String(task.actual_end_date).slice(0, 10) : "";
            byId("taskUrl").value = isBlog && task.task_url ? String(task.task_url) : "";
            byId("taskSupportAmount").value = isBlog && task.support_amount != null ? String(task.support_amount) : "";
            byId("taskActualAmount").value = isBlog && task.actual_amount != null ? String(task.actual_amount) : "";
        }
    }

    function setTaskMode(mode, task) {
        state.taskMode = mode;
        byId("taskListSection").hidden = mode !== "list";
        byId("taskFormSection").hidden = mode !== "form";
        byId("btnBackToTaskListInline").hidden = mode !== "form";
        UX.setText(byId("taskWorkspaceTitle"), mode === "form" ? (task && task.task_id ? "태스크 수정" : "태스크 등록") : "프로젝트 태스크 목록");
        UX.setText(byId("taskWorkspaceSubtitle"), mode === "form" ? "프로젝트 기준으로 태스크를 관리합니다." : "목록에서 태스크를 선택하거나 새 태스크를 등록하세요.");
    }

    function renderTaskTable() {
        var target = byId("taskRows");
        if (!target) return;

        if (!state.tasks.length) {
            target.innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">등록된 태스크가 없습니다.</td></tr>";
            return;
        }

        target.innerHTML = buildTaskRows().map(function (task) {
            var taskId = String(task.task_id || "");
            var selected = taskId === String(state.selectedTaskId);
            var relationLabel = taskRelationLabel(task) || "-";
            var depth = Number(task._tree_depth || 0);
            var indent = depth * 22;
            var iconClass = depth > 0 ? "task-tree-icon is-child" : "task-tree-icon is-root";
            var depthBadge = depth > 0 ? "<span class=\"task-tree-depth\">Lv." + esc(String(depth + 1)) + "</span>" : "<span class=\"task-tree-depth is-root\">ROOT</span>";
            return "<tr class=\"" + (selected ? "is-selected" : "") + "\" data-task-id=\"" + esc(taskId) + "\">"
                + "<td><div class=\"row-link task-tree-link\" style=\"--task-tree-indent:" + esc(String(indent)) + "px\">"
                + "<span class=\"task-tree-main\"><span class=\"" + iconClass + "\" aria-hidden=\"true\"></span><span class=\"row-title\">" + esc(task.task_title || "-") + "</span>" + depthBadge + "</span>"
                + "<span class=\"row-sub\">" + esc(relationLabel) + "</span></div></td>"
                + "<td><span class=\"status-chip status-" + esc(String(task.task_status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")) + "\">" + esc(task.task_status || "-") + "</span></td>"
                + "<td><span class=\"status-chip priority-" + esc(String(task.priority || "").toLowerCase()) + "\">" + esc(task.priority || "-") + "</span></td>"
                + "<td>" + esc(task.assignee_user_id || "-") + "</td>"
                + "<td>" + esc(formatPeriod(task.start_date, task.due_date)) + "</td>"
                + "<td><div class=\"btns\"><span>" + esc(formatProgress(task.progress_rate)) + "</span><button type=\"button\" class=\"task-edit-action btn\" data-task-id=\"" + esc(taskId) + "\">수정</button></div></td>"
                + "</tr>";
        }).join("");

        UX.qsa(".task-edit-action", target).forEach(function (button) {
            UX.bindOnce(button, "click", function (event) {
                event.stopPropagation();
                openTaskEditor(button.getAttribute("data-task-id"));
            });
        });
    }

    function renderParentTaskOptions(selectedTaskId, parentTaskId) {
        var select = byId("taskParentTaskId");
        if (!select) return;

        var currentId = selectedTaskId ? String(selectedTaskId) : "";
        var selectedParentId = parentTaskId ? String(parentTaskId) : "";
        var options = ["<option value=\"\">상위 태스크 없음</option>"];

        buildTaskRows().forEach(function (task) {
            var taskId = String(task.task_id || "");
            if (!taskId || !canAcceptChild(task, currentId)) return;
            options.push("<option value=\"" + esc(taskId) + "\">" + esc(taskOptionLabel(task)) + "</option>");
        });

        select.innerHTML = options.join("");
        select.value = selectedParentId;
    }

    function renderTaskForm(task) {
        state.selectedTaskId = task && task.task_id ? String(task.task_id) : "";
        setTaskMode("form", task);
        byId("taskId").value = task && task.task_id ? String(task.task_id) : "";
        byId("taskTitle").value = task && task.task_title ? String(task.task_title) : "";
        byId("taskStatus").value = task && task.task_status ? String(task.task_status) : "TODO";
        byId("taskPriority").value = task && task.priority ? String(task.priority) : "MEDIUM";
        renderParentTaskOptions(task && task.task_id ? String(task.task_id) : "", task && task.parent_task_id ? String(task.parent_task_id) : "");
        byId("taskAssigneeUserId").value = task && task.assignee_user_id ? String(task.assignee_user_id) : "";
        byId("taskAssigneeDisplay").value = userLabel(task && task.assignee_user_nm ? String(task.assignee_user_nm) : "", task && task.assignee_user_id ? String(task.assignee_user_id) : "");
        byId("taskStartDate").value = task && task.start_date ? String(task.start_date).slice(0, 10) : "";
        byId("taskDueDate").value = task && task.due_date ? String(task.due_date).slice(0, 10) : "";
        byId("taskProgressRate").value = task && task.progress_rate != null ? String(Math.round(Number(task.progress_rate || 0))) : "0";
        syncProgressRateLabel(byId("taskProgressRate").value);
        byId("taskDescription").value = task && task.description ? String(task.description) : "";
        applyTaskFieldMode(task);
        byId("taskMeta").innerHTML = task && task.task_id
            ? "<span>태스크 ID " + esc(task.task_id) + "</span><span>유형 " + esc(projectTypeCode()) + "</span><span>프로젝트 " + esc(state.project && state.project.project_name || "-") + "</span><span>상위 태스크 " + esc(task.parent_task_title || "-") + "</span>"
            : "<span>선택한 프로젝트 아래에 새 태스크를 등록합니다.</span>";
        byId("taskParentTaskId").disabled = false;
        setTaskFormMessage("", "");
    }

    function backToTaskList() {
        state.selectedTaskId = "";
        setTaskMode("list");
        renderTaskTable();
        setTaskFormMessage("", "");
    }

    function createTaskPayload() {
        var typeCode = projectTypeCode();
        var isDevelopment = typeCode === "DEVELOPMENT";
        var isBlog = typeCode === "BLOG";

        return {
            task_id: byId("taskId").value.trim() || null,
            project_id: state.projectId,
            parent_task_id: byId("taskParentTaskId").value.trim() || null,
            task_title: byId("taskTitle").value.trim(),
            task_status: byId("taskStatus").value,
            priority: byId("taskPriority").value,
            assignee_user_id: byId("taskAssigneeUserId").value.trim(),
            start_date: byId("taskStartDate").value || null,
            due_date: byId("taskDueDate").value || null,
            actual_start_date: isDevelopment ? (byId("taskActualStartDate").value || null) : null,
            actual_end_date: isDevelopment ? (byId("taskActualEndDate").value || null) : null,
            task_url: isBlog ? (byId("taskUrl").value.trim() || null) : null,
            support_amount: isBlog ? (byId("taskSupportAmount").value || null) : null,
            actual_amount: isBlog ? (byId("taskActualAmount").value || null) : null,
            progress_rate: isBlog ? 0 : (byId("taskProgressRate").value || 0),
            description: byId("taskDescription").value.trim()
        };
    }

    function validateTaskPayload(payload) {
        if (!payload.project_id) {
            return { message: "프로젝트 정보가 없습니다.", fieldId: "taskProjectName" };
        }
        if (!payload.task_title) {
            return { message: "태스크명을 입력하세요.", fieldId: "taskTitle" };
        }
        if (!payload.assignee_user_id) {
            return { message: "담당자를 선택하세요.", fieldId: "btnPickAssignee" };
        }
        if (payload.start_date && payload.due_date && payload.start_date > payload.due_date) {
            return { message: "시작일은 마감일보다 늦을 수 없습니다.", fieldId: "taskStartDate" };
        }
        if (payload.actual_start_date && payload.actual_end_date && payload.actual_start_date > payload.actual_end_date) {
            return { message: "실제 시작일은 실제 종료일보다 늦을 수 없습니다.", fieldId: "taskActualStartDate" };
        }
        return null;
    }

    function clearFieldHighlight() {
        UX.qsa(".input.is-warning-focus, .btn.is-warning-focus").forEach(function (element) {
            element.classList.remove("is-warning-focus");
        });
    }

    function focusField(fieldId) {
        var target = byId(fieldId);
        if (!target) return;
        clearFieldHighlight();
        target.classList.add("is-warning-focus");
        target.focus();
    }

    function showWarningModal(message, fieldId) {
        UX.showAlertModal({
            title: "확인 필요",
            message: message,
            onClose: function () {
                if (fieldId) {
                    focusField(fieldId);
                }
            }
        });
    }

    function warningFieldIdFromMessage(message) {
        if (!message) return "";
        if (message.indexOf("task_title") >= 0 || message.indexOf("태스크명") >= 0) return "taskTitle";
        if (message.indexOf("assignee") >= 0 || message.indexOf("담당자") >= 0) return "btnPickAssignee";
        if (message.indexOf("start_date") >= 0 || message.indexOf("시작일") >= 0) return "taskStartDate";
        if (message.indexOf("due_date") >= 0 || message.indexOf("마감일") >= 0) return "taskDueDate";
        if (message.indexOf("actual_start_date") >= 0 || message.indexOf("실제 시작일") >= 0) return "taskActualStartDate";
        if (message.indexOf("actual_end_date") >= 0 || message.indexOf("실제 종료일") >= 0) return "taskActualEndDate";
        if (message.indexOf("task_url") >= 0 || message.indexOf("주소") >= 0) return "taskUrl";
        if (message.indexOf("support_amount") >= 0 || message.indexOf("지원금액") >= 0) return "taskSupportAmount";
        if (message.indexOf("actual_amount") >= 0 || message.indexOf("실 사용금액") >= 0) return "taskActualAmount";
        if (message.indexOf("project") >= 0 || message.indexOf("프로젝트") >= 0) return "taskProjectName";
        if (message.indexOf("parent_task") >= 0 || message.indexOf("상위 태스크") >= 0) return "taskParentTaskId";
        if (message.indexOf("4 levels") >= 0 || message.indexOf("4레벨") >= 0) return "taskParentTaskId";
        return "";
    }

    function saveTask() {
        var payload = createTaskPayload();
        var validationMessage = validateTaskPayload(payload);
        if (validationMessage) {
            showWarningModal(validationMessage.message, validationMessage.fieldId);
            return;
        }

        UX.requestJson("/task/save.json", payload).then(function (response) {
            if (!response || response.ok !== true) {
                showWarningModal(apiMessage(response, "태스크 저장에 실패했습니다."), warningFieldIdFromMessage(response && response.message));
                return;
            }
            clearFieldHighlight();
            setTaskMessage("태스크가 저장되었습니다.", "success");
            backToTaskList();
            loadTasks();
        }).catch(function () {
            showWarningModal("태스크 저장에 실패했습니다.");
        });
    }

    function openTaskEditor(taskId) {
        UX.requestJson("/task/detail.json", { task_id: taskId }).then(function (response) {
            if (!response || response.ok !== true) {
                setTaskMessage(apiMessage(response, "태스크 상세를 불러오지 못했습니다."), "error");
                return;
            }
            renderTaskForm(response.data || null);
        }).catch(function () {
            setTaskMessage("태스크 상세를 불러오지 못했습니다.", "error");
        });
    }

    function toggleAssigneeModal(open) {
        byId("assigneeModal").hidden = !open;
        if (open) byId("assigneeKeyword").focus();
    }

    function renderAssigneeList(items) {
        var target = byId("assigneeList");
        if (!target) return;

        if (!items || !items.length) {
            target.innerHTML = "<div class=\"detail-empty\">조회된 사용자가 없습니다.</div>";
            return;
        }

        target.innerHTML = items.map(function (item) {
            return "<button type=\"button\" class=\"manager-option\" data-user-id=\"" + esc(item.user_id || "") + "\" data-user-nm=\"" + esc(item.user_nm || "") + "\">"
                + "<strong>" + esc(userLabel(item.user_nm || "", item.user_id || "")) + "</strong>"
                + "<span>" + esc(item.user_nm || "") + "</span>"
                + "</button>";
        }).join("");

        UX.qsa(".manager-option", target).forEach(function (button) {
            UX.bindOnce(button, "click", function () {
                byId("taskAssigneeUserId").value = button.getAttribute("data-user-id") || "";
                byId("taskAssigneeDisplay").value = userLabel(button.getAttribute("data-user-nm") || "", button.getAttribute("data-user-id") || "");
                toggleAssigneeModal(false);
            });
        });
    }

    function loadAssigneeOptions() {
        byId("assigneeList").innerHTML = "<div class=\"detail-empty\">사용자 목록을 조회하는 중입니다.</div>";
        UX.requestJson("/project/manager-options.json", { keyword: byId("assigneeKeyword").value.trim() }).then(function (response) {
            if (!response || response.ok !== true) {
                byId("assigneeList").innerHTML = "<div class=\"detail-empty\">사용자 목록을 불러오지 못했습니다.</div>";
                return;
            }
            renderAssigneeList(Array.isArray(response.data) ? response.data : []);
        }).catch(function () {
            byId("assigneeList").innerHTML = "<div class=\"detail-empty\">사용자 목록을 불러오지 못했습니다.</div>";
        });
    }

    function loadProject() {
        return UX.requestJson("/project/detail.json", { project_id: state.projectId }).then(function (response) {
            if (!response || response.ok !== true) {
                setTaskMessage(apiMessage(response, "프로젝트를 찾을 수 없습니다."), "error");
                return;
            }
            state.project = response.data || null;
            renderProjectSummary();
            applyTaskFieldMode(null);
        }).catch(function () {
            setTaskMessage("프로젝트를 찾을 수 없습니다.", "error");
        });
    }

    function loadTasks() {
        byId("taskRows").innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">태스크를 불러오는 중입니다.</td></tr>";
        return UX.requestJson("/task/list.json", { project_id: state.projectId }).then(function (response) {
            if (!response || response.ok !== true) {
                state.tasks = [];
                byId("taskRows").innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">태스크를 불러오지 못했습니다.</td></tr>";
                return;
            }
            state.tasks = Array.isArray(response.data) ? response.data : [];
            renderTaskTable();
            renderParentTaskOptions(state.selectedTaskId, byId("taskParentTaskId") ? byId("taskParentTaskId").value : "");
        }).catch(function () {
            state.tasks = [];
            byId("taskRows").innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">태스크를 불러오지 못했습니다.</td></tr>";
            renderParentTaskOptions("", "");
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

    function logout() {
        UX.requestJson("/logout.json", {}).finally(function () {
            UX.localRemove(["JWT", "REFRESH_TOKEN", "LOGIN_USER", "LOGIN_SESSION_ID"]);
            redirectToLogin();
        });
    }

    function bindEvents() {
        UX.bindOnce(byId("btnReload"), "click", function () {
            loadContext().then(loadProject).then(loadTasks);
        });
        UX.bindOnce(byId("btnLogout"), "click", logout);
        UX.bindOnce(byId("btnBackToProjects"), "click", goToProjects);
        UX.bindOnce(byId("btnOpenProject"), "click", function () {
            if (!state.projectId) return;
            global.location.href = "/project-form.html?project_id=" + encodeURIComponent(state.projectId);
        });
        UX.bindOnce(byId("btnNewTask"), "click", function () { renderTaskForm(null); });
        UX.bindOnce(byId("btnBackToTaskListInline"), "click", backToTaskList);
        UX.bindOnce(byId("btnCancelTaskInline"), "click", backToTaskList);
        UX.bindOnce(byId("btnSaveTaskInline"), "click", saveTask);
        UX.bindOnce(byId("btnPickAssignee"), "click", function () { toggleAssigneeModal(true); loadAssigneeOptions(); });
        UX.bindOnce(byId("btnCloseAssigneeModal"), "click", function () { toggleAssigneeModal(false); });
        UX.bindOnce(byId("btnSearchAssignee"), "click", loadAssigneeOptions);
        UX.bindOnce(byId("assigneeModal"), "click", function (event) {
            if (event.target && event.target.id === "assigneeModal") toggleAssigneeModal(false);
        });
        ["taskTitle", "taskParentTaskId", "taskStartDate", "taskDueDate", "taskActualStartDate", "taskActualEndDate", "taskUrl", "taskSupportAmount", "taskActualAmount", "taskProjectName", "taskAssigneeDisplay", "btnPickAssignee"].forEach(function (id) {
            var target = byId(id);
            if (!target) return;
            target.addEventListener("focus", clearFieldHighlight);
            target.addEventListener("input", clearFieldHighlight);
            target.addEventListener("change", clearFieldHighlight);
            target.addEventListener("click", clearFieldHighlight);
        });
        UX.bindOnce(byId("assigneeKeyword"), "keydown", function (event) {
            if (event.key === "Enter") loadAssigneeOptions();
        });
        UX.bindOnce(byId("btnSidebarToggle"), "click", function () {
            setSidebarOpen(!state.sidebarOpen);
        });
        UX.bindOnce(byId("taskProgressRate"), "input", function () {
            syncProgressRateLabel(byId("taskProgressRate").value);
        });
        global.addEventListener("resize", syncSidebarMode);
        global.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !byId("assigneeModal").hidden) {
                toggleAssigneeModal(false);
                return;
            }
            if (event.key === "Escape" && state.taskMode === "form") {
                backToTaskList();
            }
        });
    }

    state.projectId = queryParam("project_id") || "";

    bindEvents();
    syncSidebarMode();
    setTaskMode("list");

    if (!state.projectId) {
        byId("selectedProjectName").textContent = "프로젝트를 먼저 선택하세요";
        byId("projectSummary").innerHTML = "<span>프로젝트 목록에서 프로젝트를 선택한 뒤 진입해야 합니다.</span>";
        byId("taskRows").innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">프로젝트 목록에서 프로젝트를 선택한 뒤 태스크를 관리하세요.</td></tr>";
        byId("btnOpenProject").disabled = true;
        byId("btnNewTask").disabled = true;
        loadContext();
        return;
    }

    loadContext().then(loadProject).then(loadTasks);
})(window);
