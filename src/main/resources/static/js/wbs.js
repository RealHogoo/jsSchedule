(function (global) {
    "use strict";

    var UX = global.UX;
    var DAY_WIDTH = 48;
    var EMPTY_SUMMARY = {
        project_total: 0,
        task_total: 0,
        task_in_progress: 0,
        task_overdue: 0
    };
    var state = {
        sidebarOpen: false,
        currentUser: {},
        summary: EMPTY_SUMMARY,
        projects: [],
        selectedProjectId: "",
        project: null,
        tasks: [],
        timelineStart: null,
        timelineEnd: null
    };

    function byId(id) { return UX.byId(id); }
    function esc(value) { return UX.esc(value == null ? "" : String(value)); }
    function redirectToLogin() { global.location.href = "/"; }
    function queryParam(name) { return new URLSearchParams(global.location.search).get(name); }
    function pad(value) { return String(value).padStart(2, "0"); }
    function parseDate(value) {
        var parts;
        if (!value) return null;
        parts = String(value).slice(0, 10).split("-");
        if (parts.length !== 3) return null;
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    function toDateKey(date) {
        return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
    }
    function addDays(date, amount) {
        var next = new Date(date);
        next.setDate(next.getDate() + amount);
        return next;
    }
    function diffDays(start, end) {
        return Math.round((end.getTime() - start.getTime()) / 86400000);
    }
    function number(value) {
        var n = Number(value || 0);
        return isNaN(n) ? 0 : n;
    }
    function formatCount(value) {
        return String(Math.round(number(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    function formatDate(value) {
        return value ? String(value).slice(0, 10) : "-";
    }
    function formatRange(startDate, endDate) {
        return formatDate(startDate) + " ~ " + formatDate(endDate);
    }
    function statusLabel(value) {
        var status = String(value || "TODO").toUpperCase();
        if (status === "IN_PROGRESS") return "진행 중";
        if (status === "DONE") return "완료";
        if (status === "HOLD") return "보류";
        return "할 일";
    }
    function priorityLabel(value) {
        var priority = String(value || "MEDIUM").toUpperCase();
        if (priority === "HIGH") return "높음";
        if (priority === "LOW") return "낮음";
        return "보통";
    }
    function normalizeWbsColor(value) {
        var color = String(value || "").trim().toUpperCase();
        if (!/^#([0-9A-F]{6})$/.test(color)) return "#0F766E";
        return color;
    }
    function taskWbsColor(task) {
        return normalizeWbsColor(task && task.wbs_color);
    }
    function setMessage(text, type) {
        var target = byId("wbsActionMsg");
        if (!target) return;
        target.textContent = text || "";
        target.className = "form-msg" + (type ? " is-" + type : "");
    }
    function compareTasks(a, b) {
        var aStart = a && a.start_date ? String(a.start_date) : "9999-12-31";
        var bStart = b && b.start_date ? String(b.start_date) : "9999-12-31";
        if (aStart < bStart) return -1;
        if (aStart > bStart) return 1;
        return Number(a && a.task_id || 0) - Number(b && b.task_id || 0);
    }
    function buildTaskRows(tasks) {
        var byParent = {};
        var byTaskId = {};
        var ordered = [];

        tasks.forEach(function (task) {
            var taskId = String(task && task.task_id || "");
            if (!taskId) return;
            byTaskId[taskId] = task;
        });

        tasks.forEach(function (task) {
            var parentId = task && task.parent_task_id ? String(task.parent_task_id) : "";
            if (parentId && !byTaskId[parentId]) parentId = "";
            if (!byParent[parentId]) byParent[parentId] = [];
            byParent[parentId].push(task);
        });

        Object.keys(byParent).forEach(function (key) {
            byParent[key].sort(compareTasks);
        });

        function visit(parentId, depth, seen, path) {
            (byParent[parentId] || []).forEach(function (task, index) {
                var taskId = String(task && task.task_id || "");
                if (!taskId || seen[taskId]) return;
                seen[taskId] = true;
                task._tree_depth = depth;
                task._wbsCode = path.concat(index + 1).join(".");
                ordered.push(task);
                visit(taskId, depth + 1, seen, path.concat(index + 1));
            });
        }

        visit("", 0, {}, []);
        tasks.filter(function (task) {
            return ordered.indexOf(task) < 0;
        }).sort(compareTasks).forEach(function (task) {
            task._tree_depth = 0;
            task._wbsCode = String(ordered.length + 1);
            ordered.push(task);
        });
        return ordered;
    }
    function taskRange(task) {
        var start = parseDate(task && (task.start_date || task.due_date));
        var end = parseDate(task && (task.due_date || task.start_date));
        if (start && end && start > end) {
            return { start: end, end: start };
        }
        return { start: start, end: end };
    }
    function resolveTimelineBounds(project, tasks) {
        var taskStarts = tasks.map(function (task) { return taskRange(task).start; }).filter(Boolean);
        var taskEnds = tasks.map(function (task) { return taskRange(task).end; }).filter(Boolean);
        var start = parseDate(project && project.start_date);
        var end = parseDate(project && project.end_date);

        if (!start && taskStarts.length) {
            start = taskStarts.reduce(function (acc, date) { return !acc || date < acc ? date : acc; }, null);
        }
        if (!end && taskEnds.length) {
            end = taskEnds.reduce(function (acc, date) { return !acc || date > acc ? date : acc; }, null);
        }
        if (!start && end) start = new Date(end);
        if (!end && start) end = new Date(start);
        if (!start && !end) {
            start = new Date();
            end = new Date();
        }
        if (start > end) {
            end = new Date(start);
        }
        return {
            start: start,
            end: end
        };
    }
    function projectTypeLabel(value) {
        var type = String(value || "GENERAL").toUpperCase();
        if (type === "DEVELOPMENT") return "개발";
        if (type === "BLOG") return "블로그";
        return "일반";
    }
    function projectStatusLabel(value) {
        var status = String(value || "PLANNING").toUpperCase();
        if (status === "READY") return "준비 완료";
        if (status === "IN_PROGRESS") return "진행 중";
        if (status === "DONE") return "완료";
        if (status === "HOLD") return "보류";
        return "기획 중";
    }
    function renderSummary(summary) {
        var target = byId("summaryCards");
        var cards;
        if (!target) return;
        cards = [
            { label: "전체 프로젝트", value: summary.project_total || 0 },
            { label: "전체 태스크", value: summary.task_total || 0 },
            { label: "진행 태스크", value: summary.task_in_progress || 0 },
            { label: "지연 태스크", value: summary.task_overdue || 0 }
        ];
        target.innerHTML = cards.map(function (card) {
            return "<article class=\"summary-card\"><span>" + esc(card.label) + "</span><strong>" + esc(formatCount(card.value)) + "</strong></article>";
        }).join("");
    }
    function bindInfo(targetId, rows) {
        var target = byId(targetId);
        if (!target) return;
        target.innerHTML = rows.map(function (row) {
            return "<dt>" + esc(row.label) + "</dt><dd>" + esc(row.value) + "</dd>";
        }).join("");
    }
    function renderProjectOptions() {
        var select = byId("filterProject");
        if (!select) return;
        if (!state.projects.length) {
            select.innerHTML = "<option value=\"\">프로젝트 없음</option>";
            return;
        }
        select.innerHTML = state.projects.map(function (project) {
            return "<option value=\"" + esc(project.project_id) + "\"" + (String(project.project_id) === String(state.selectedProjectId) ? " selected" : "") + ">"
                + esc((project.project_key || "P") + " - " + (project.project_name || "-"))
                + "</option>";
        }).join("");
    }
    function renderProjectSummary() {
        var target = byId("projectSummary");
        var project = state.project;
        if (!target) return;
        if (!project) {
            target.innerHTML = "<span>선택한 프로젝트 정보를 찾을 수 없습니다.</span>";
            return;
        }
        target.innerHTML = [
            "<span>유형 " + esc(projectTypeLabel(project.project_type_code)) + "</span>",
            "<span>상태 " + esc(projectStatusLabel(project.project_status)) + "</span>",
            "<span>담당자 " + esc(project.owner_user_id || "-") + "</span>",
            "<span>기간 " + esc(formatRange(project.start_date, project.end_date)) + "</span>",
            "<span>태스크 " + esc(formatCount(project.task_count || state.tasks.length)) + "</span>",
            "<span>마일스톤 " + esc(formatCount(project.milestone_count || 0)) + "</span>"
        ].join("");
    }
    function renderEmptyBoard(message) {
        byId("timelineMeta").textContent = message;
        byId("wbsTimelineScale").innerHTML = "<div class=\"detail-empty\">" + esc(message) + "</div>";
        byId("wbsTreeRows").innerHTML = "<div class=\"detail-empty\">" + esc(message) + "</div>";
        byId("wbsTimelineRows").innerHTML = "<div class=\"detail-empty\">" + esc(message) + "</div>";
    }
    function renderTimelineScale(start, end) {
        var target = byId("wbsTimelineScale");
        var meta = byId("timelineMeta");
        var totalDays = diffDays(start, end) + 1;
        var width = Math.max(totalDays * DAY_WIDTH, 720);
        var marks = [];
        var index;
        var cursor;

        target.style.width = width + "px";
        meta.textContent = formatRange(toDateKey(start), toDateKey(end)) + " · 총 " + totalDays + "일";

        for (index = 0; index < totalDays; index += 1) {
            cursor = addDays(start, index);
            marks.push(
                "<div class=\"wbs-scale-cell\">"
                + "<strong>" + esc(pad(cursor.getMonth() + 1) + "." + pad(cursor.getDate())) + "</strong>"
                + "<span>D+" + esc(String(index)) + "</span>"
                + "</div>"
            );
        }
        target.innerHTML = marks.join("");
        target.style.gridTemplateColumns = "repeat(" + totalDays + ", minmax(" + DAY_WIDTH + "px, 1fr))";
        return {
            totalDays: totalDays,
            width: width
        };
    }
    function renderTaskRows(start, end) {
        var treeTarget = byId("wbsTreeRows");
        var timelineTarget = byId("wbsTimelineRows");
        var orderedTasks = buildTaskRows(state.tasks.slice());
        var totalDays = diffDays(start, end) + 1;
        var width = Math.max(totalDays * DAY_WIDTH, 720);

        if (!orderedTasks.length) {
            treeTarget.innerHTML = "<div class=\"detail-empty\">등록된 태스크가 없습니다.</div>";
            timelineTarget.innerHTML = "<div class=\"detail-empty\">등록된 태스크가 없습니다.</div>";
            return;
        }

        treeTarget.innerHTML = orderedTasks.map(function (task) {
            var depth = Number(task._tree_depth || 0);
            var relation = task.parent_task_title ? ("상위: " + task.parent_task_title) : "루트 태스크";
            return "<article class=\"wbs-tree-row\" style=\"--wbs-depth:" + esc(String(depth)) + "\">"
                + "<div class=\"wbs-tree-code\" style=\"--wbs-accent:" + esc(taskWbsColor(task)) + "\">" + esc(task._wbsCode || "-") + "</div>"
                + "<div class=\"wbs-tree-copy\">"
                + "<strong>" + esc(task.task_title || "-") + "</strong>"
                + "<span>" + esc(relation) + "</span>"
                + "<div class=\"wbs-tree-meta\">"
                + "<span>" + esc(statusLabel(task.task_status)) + "</span>"
                + "<span>" + esc(priorityLabel(task.priority)) + "</span>"
                + "<span>" + esc(task.assignee_user_id || "-") + "</span>"
                + "</div>"
                + "</div>"
                + "</article>";
        }).join("");

        timelineTarget.innerHTML = orderedTasks.map(function (task) {
            var range = taskRange(task);
            var barLeft = 0;
            var barWidth = 0;
            var label = formatRange(task.start_date, task.due_date);
            if (range.start && range.end) {
                barLeft = (diffDays(start, range.start) / totalDays) * 100;
                barWidth = ((diffDays(range.start, range.end) + 1) / totalDays) * 100;
            }
            return "<article class=\"wbs-timeline-row\" style=\"width:" + esc(String(width)) + "px\">"
                + "<div class=\"wbs-timeline-grid\"></div>"
                + (range.start && range.end
                    ? "<button type=\"button\" class=\"wbs-bar\" style=\"left:" + esc(String(barLeft)) + "%;width:" + esc(String(Math.max(barWidth, 2.5))) + "%;--wbs-accent:" + esc(taskWbsColor(task)) + "\" data-project-id=\"" + esc(task.project_id || "") + "\" data-task-id=\"" + esc(task.task_id || "") + "\">"
                        + "<span class=\"wbs-bar-title\">" + esc(task._wbsCode || "-") + " " + esc(task.task_title || "-") + "</span>"
                        + "<span class=\"wbs-bar-range\">" + esc(label) + "</span>"
                        + "</button>"
                    : "<div class=\"wbs-bar is-empty\"><span>일정 미지정</span></div>")
                + "</article>";
        }).join("");

        UX.qsa(".wbs-bar[data-project-id]", timelineTarget).forEach(function (button) {
            UX.bindOnce(button, "click", function () {
                var projectId = button.getAttribute("data-project-id");
                var taskId = button.getAttribute("data-task-id");
                if (!projectId) return;
                global.location.href = "/task-form.html?project_id=" + encodeURIComponent(projectId)
                    + (taskId ? "&task_id=" + encodeURIComponent(taskId) : "");
            });
        });
    }
    function renderBoard() {
        var bounds;
        if (!state.project) {
            renderEmptyBoard("프로젝트를 선택하세요.");
            return;
        }
        bounds = resolveTimelineBounds(state.project, state.tasks);
        state.timelineStart = bounds.start;
        state.timelineEnd = bounds.end;
        renderTimelineScale(bounds.start, bounds.end);
        renderTaskRows(bounds.start, bounds.end);
    }
    function bindTimelineSync() {
        var head = byId("wbsTimelineScale");
        var headWrap = head ? head.parentNode : null;
        var bodyWrap = byId("wbsTimelineRows");
        var bodyScroller = bodyWrap ? bodyWrap.parentNode : null;
        var syncingHead = false;
        var syncingBody = false;

        if (!headWrap || !bodyScroller || headWrap.dataset.scrollSyncBound === "1") {
            return;
        }

        headWrap.dataset.scrollSyncBound = "1";
        bodyScroller.dataset.scrollSyncBound = "1";

        headWrap.addEventListener("scroll", function () {
            if (syncingHead) {
                syncingHead = false;
                return;
            }
            syncingBody = true;
            bodyScroller.scrollLeft = headWrap.scrollLeft;
        });

        bodyScroller.addEventListener("scroll", function () {
            if (syncingBody) {
                syncingBody = false;
                return;
            }
            syncingHead = true;
            headWrap.scrollLeft = bodyScroller.scrollLeft;
        });
    }
    function loadContext() {
        return UX.requestJson("/auth/me.json", {}).then(function (me) {
            if (!me || me.ok !== true) {
                redirectToLogin();
                return;
            }
            state.currentUser = me.data || {};
            bindInfo("currentUser", [
                { label: "아이디", value: state.currentUser.user_id || "-" },
                { label: "이름", value: state.currentUser.user_nm || "-" },
                { label: "권한", value: (state.currentUser.roles || []).join(", ") || "-" }
            ]);
            return UX.requestJson("/dashboard/summary.json", {}).then(function (summaryResponse) {
                state.summary = summaryResponse && summaryResponse.ok === true && summaryResponse.data ? (summaryResponse.data.summary || EMPTY_SUMMARY) : EMPTY_SUMMARY;
                renderSummary(state.summary);
            }).catch(function () {
                state.summary = EMPTY_SUMMARY;
                renderSummary(state.summary);
            });
        }).catch(function () {
            redirectToLogin();
        });
    }
    function loadProjects() {
        return UX.requestJson("/project/list.json", {}).then(function (response) {
            var requestedId = queryParam("project_id");
            var nextId;
            state.projects = response && response.ok === true && Array.isArray(response.data) ? response.data : [];
            nextId = state.selectedProjectId || requestedId;
            if (!nextId || !state.projects.some(function (project) { return String(project.project_id) === String(nextId); })) {
                nextId = state.projects[0] ? String(state.projects[0].project_id) : "";
            }
            state.selectedProjectId = nextId;
            renderProjectOptions();
            if (!state.selectedProjectId) {
                state.project = null;
                state.tasks = [];
                renderProjectSummary();
                renderEmptyBoard("표시할 프로젝트가 없습니다.");
                return;
            }
            return loadProjectData();
        }).catch(function () {
            setMessage("프로젝트 목록을 불러오지 못했습니다.", "error");
        });
    }
    function loadProjectData() {
        if (!state.selectedProjectId) {
            state.project = null;
            state.tasks = [];
            renderProjectSummary();
            renderEmptyBoard("프로젝트를 선택하세요.");
            return Promise.resolve();
        }

        setMessage("WBS 데이터를 불러오는 중입니다.", "info");
        return Promise.all([
            UX.requestJson("/project/detail.json", { project_id: state.selectedProjectId }),
            UX.requestJson("/task/list.json", { project_id: state.selectedProjectId })
        ]).then(function (results) {
            var projectResponse = results[0];
            var taskResponse = results[1];
            state.project = projectResponse && projectResponse.ok === true ? (projectResponse.data || null) : null;
            state.tasks = taskResponse && taskResponse.ok === true && Array.isArray(taskResponse.data) ? taskResponse.data : [];
            renderProjectSummary();
            renderBoard();
            setMessage("", "");
        }).catch(function () {
            state.project = null;
            state.tasks = [];
            renderProjectSummary();
            renderEmptyBoard("WBS 데이터를 불러오지 못했습니다.");
            setMessage("WBS 데이터를 불러오지 못했습니다.", "error");
        });
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
        UX.bindOnce(byId("btnReload"), "click", function () {
            loadContext().then(loadProjects);
        });
        UX.bindOnce(byId("btnLogout"), "click", logout);
        UX.bindOnce(byId("btnSidebarToggle"), "click", function () {
            setSidebarOpen(!state.sidebarOpen);
        });
        UX.bindOnce(byId("filterProject"), "change", function () {
            state.selectedProjectId = byId("filterProject").value;
            loadProjectData();
        });
        UX.bindOnce(byId("btnProjectInfo"), "click", function () {
            if (!state.selectedProjectId) return;
            global.location.href = "/project-form.html?project_id=" + encodeURIComponent(state.selectedProjectId);
        });
        UX.bindOnce(byId("btnTaskBoard"), "click", function () {
            if (!state.selectedProjectId) return;
            global.location.href = "/task-form.html?project_id=" + encodeURIComponent(state.selectedProjectId);
        });
        global.addEventListener("resize", syncSidebarMode);
    }

    bindEvents();
    syncSidebarMode();
    bindTimelineSync();
    renderEmptyBoard("WBS 데이터를 불러오는 중입니다.");
    loadContext().then(loadProjects);
})(window);
