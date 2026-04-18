
(function (global) {
    "use strict";

    var UX = global.UX;
    var state = {
        sidebarOpen: false,
        currentUser: {},
        projectId: "",
        initialTaskId: "",
        project: null,
        tasks: [],
        selectedTaskId: "",
        taskMode: "list",
        mapConfig: null,
        blogRouteInfo: null,
        blogRouteTimer: null,
        blogMapScriptPromise: null,
        blogMapInstance: null
    };
    var MAX_TASK_DEPTH = 3;
    var taskFormHome = null;

    function byId(id) { return UX.byId(id); }
    function esc(value) { return UX.esc(value == null ? "" : String(value)); }
    function queryParam(name) { return new URLSearchParams(global.location.search).get(name); }
    function redirectToLogin() { global.location.href = "/"; }
    function goToProjects() { global.location.href = "/project.html"; }
    function projectTypeCode() { return state.project && state.project.project_type_code ? String(state.project.project_type_code) : "GENERAL"; }
    function isBlogProject() { return projectTypeCode() === "BLOG"; }
    function projectOriginAddress() { return state.project && state.project.origin_address ? String(state.project.origin_address) : ""; }
    function setHidden(el, hidden) { if (el) el.hidden = !!hidden; }

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

    function formatPeriod(startDate, dueDate) { return (startDate || "-") + " ~ " + (dueDate || "-"); }
    function formatProgress(progressRate) {
        var value = Number(progressRate || 0);
        if (isNaN(value)) value = 0;
        return value.toFixed(0) + "%";
    }
    function formatDistance(distanceMeters) {
        var distance = Number(distanceMeters || 0);
        if (distance >= 1000) return (distance / 1000).toFixed(distance >= 10000 ? 0 : 1) + "km";
        return Math.round(distance) + "m";
    }
    function formatDuration(durationSeconds) {
        var totalMinutes = Math.max(0, Math.round(Number(durationSeconds || 0) / 60));
        var hours = Math.floor(totalMinutes / 60);
        var minutes = totalMinutes % 60;
        if (hours > 0 && minutes > 0) return hours + "시간 " + minutes + "분";
        if (hours > 0) return hours + "시간";
        return totalMinutes + "분";
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
        if (task && task.parent_task_title) parts.push("상위: " + task.parent_task_title);
        if (task && task.milestone_name) parts.push(task.milestone_name);
        return parts.join(" / ");
    }

    function compareTasks(a, b) {
        var aDue = a && a.due_date ? String(a.due_date) : "9999-12-31";
        var bDue = b && b.due_date ? String(b.due_date) : "9999-12-31";
        if (aDue < bDue) return -1;
        if (aDue > bDue) return 1;
        return Number(b && b.task_id || 0) - Number(a && a.task_id || 0);
    }

    function findTaskById(taskId) {
        var targetId = String(taskId || "");
        return state.tasks.find(function (task) {
            return String(task && task.task_id || "") === targetId;
        }) || null;
    }

    function buildTaskRows() {
        var byParent = {};
        var byTaskId = {};
        var ordered = [];
        state.tasks.forEach(function (task) {
            var taskId = String(task.task_id || "");
            if (!taskId) return;
            byTaskId[taskId] = task;
        });
        state.tasks.forEach(function (task) {
            var parentId = task && task.parent_task_id ? String(task.parent_task_id) : "";
            if (parentId && !byTaskId[parentId]) parentId = "";
            if (!byParent[parentId]) byParent[parentId] = [];
            byParent[parentId].push(task);
        });
        Object.keys(byParent).forEach(function (key) { byParent[key].sort(compareTasks); });
        function visit(parentId, depth, seen) {
            (byParent[parentId] || []).forEach(function (task) {
                var taskId = String(task.task_id || "");
                if (!taskId || seen[taskId]) return;
                seen[taskId] = true;
                task._tree_depth = depth;
                ordered.push(task);
                visit(taskId, depth + 1, seen);
            });
        }
        visit("", 0, {});
        state.tasks.filter(function (task) { return ordered.indexOf(task) < 0; }).sort(compareTasks).forEach(function (task) {
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
        target.innerHTML = [
            { label: "전체 프로젝트", value: summary.project_total || 0 },
            { label: "전체 태스크", value: summary.task_total || 0 },
            { label: "완료 태스크", value: summary.task_done || 0 },
            { label: "지연 태스크", value: summary.task_overdue || 0 }
        ].map(function (card) {
            return "<article class=\"summary-card\"><span>" + esc(card.label) + "</span><strong>" + esc(card.value) + "</strong></article>";
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
            "<span>태스크 " + esc(String(state.project.task_count || 0)) + "</span>",
            projectOriginAddress() ? "<span>기본 출발지 " + esc(projectOriginAddress()) + "</span>" : ""
        ].join("");
    }

    function resetBlogRouteInfo(message, type) {
        var summary = byId("blogRouteSummary");
        var metrics = byId("blogRouteMetrics");
        var moreButton = byId("btnOpenBlogMap");
        state.blogRouteInfo = null;
        if (!summary) return;
        summary.className = "blog-route-summary" + (type ? " is-" + type : "");
        summary.hidden = !isBlogProject();
        byId("blogRouteSummaryTitle").textContent = "이동 정보";
        byId("blogRouteSummaryText").textContent = message || "방문 주소를 입력하면 이동 시간과 거리를 계산합니다.";
        if (moreButton) moreButton.textContent = "카카오 길찾기";
        metrics.hidden = true;
        moreButton.hidden = true;
        byId("blogRouteDuration").textContent = "-";
        byId("blogRouteDistance").textContent = "-";
    }

    function renderBlogRouteInfo(info) {
        var origin = info && info.origin ? info.origin.address || projectOriginAddress() : projectOriginAddress();
        var destination = info && info.destination ? info.destination.address || byId("taskUrl").value.trim() : byId("taskUrl").value.trim();
        state.blogRouteInfo = info || null;
        byId("blogRouteSummary").hidden = false;
        byId("blogRouteSummary").className = "blog-route-summary";
        byId("blogRouteSummaryTitle").textContent = "방문 이동 요약";
        byId("blogRouteSummaryText").textContent = "출발지에서 방문지까지 예상 이동 정보입니다.";
        byId("blogRouteDuration").textContent = "자차 " + formatDuration(info.duration_seconds);
        byId("blogRouteDistance").textContent = "거리 " + formatDistance(info.distance_meters);
        byId("blogRouteMetrics").hidden = false;
        byId("btnOpenBlogMap").textContent = "카카오 길찾기";
        byId("btnOpenBlogMap").hidden = !(info && info.available === true);
    }

    function renderBlogMapSummary(info) {
        var summary = byId("blogMapSummary");
        var origin = info && info.origin ? info.origin.address || projectOriginAddress() : projectOriginAddress();
        var destination = info && info.destination ? info.destination.address || byId("taskUrl").value.trim() : byId("taskUrl").value.trim();
        if (!summary) return;
        summary.hidden = !(info && info.available === true);
        byId("blogMapOrigin").textContent = origin || "-";
        byId("blogMapDestination").textContent = destination || "-";
        byId("blogMapDuration").textContent = info && info.available === true ? formatDuration(info.duration_seconds) : "-";
        byId("blogMapDistance").textContent = info && info.available === true ? formatDistance(info.distance_meters) : "-";
    }

    function kakaoLinkPart(name, latitude, longitude) {
        return encodeURIComponent(name || "지점") + "," + encodeURIComponent(String(latitude)) + "," + encodeURIComponent(String(longitude));
    }

    function openBlogRouteInKakaoMap() {
        var info = state.blogRouteInfo;
        var origin;
        var destination;
        var url;
        if (!info || info.available !== true || !info.origin || !info.destination) {
            UX.showAlertModal({ title: "확인 필요", message: "이동 정보를 먼저 계산하세요." });
            return;
        }
        origin = info.origin.address || projectOriginAddress() || "출발지";
        destination = info.destination.address || (byId("taskUrl") ? byId("taskUrl").value.trim() : "") || "방문지";
        url = "https://map.kakao.com/link/by/car/"
            + kakaoLinkPart(origin, Number(info.origin.latitude), Number(info.origin.longitude))
            + "/"
            + kakaoLinkPart(destination, Number(info.destination.latitude), Number(info.destination.longitude));
        global.open(url, "_blank", "noopener,noreferrer");
    }

    function loadMapConfig() {
        if (state.mapConfig) return Promise.resolve(state.mapConfig);
        return UX.requestJson("/map/config.json", {}).then(function (response) {
            state.mapConfig = response && response.ok === true ? (response.data || {}) : { enabled: false };
            return state.mapConfig;
        }).catch(function () {
            state.mapConfig = { enabled: false };
            return state.mapConfig;
        });
    }

    function ensureKakaoMapSdk() {
        return loadMapConfig().then(function (config) {
            return new Promise(function (resolve, reject) {
                if (!config || !config.enabled || !config.kakao_javascript_key) {
                    reject(new Error("Kakao map not configured"));
                    return;
                }
                if (global.kakao && global.kakao.maps) {
                    global.kakao.maps.load(function () { resolve(global.kakao); });
                    return;
                }
                if (state.blogMapScriptPromise) {
                    state.blogMapScriptPromise.then(resolve).catch(reject);
                    return;
                }
                state.blogMapScriptPromise = new Promise(function (innerResolve, innerReject) {
                    var script = document.createElement("script");
                    script.src = "https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=" + encodeURIComponent(config.kakao_javascript_key);
                    script.onload = function () { global.kakao.maps.load(function () { innerResolve(global.kakao); }); };
                    script.onerror = function () { innerReject(new Error("Failed to load Kakao map")); };
                    document.head.appendChild(script);
                });
                state.blogMapScriptPromise.then(resolve).catch(reject);
            });
        });
    }
    function renderBlogMapModal() {
        var info = state.blogRouteInfo;
        var mapTarget = byId("blogMapCanvas");
        var empty = byId("blogMapEmpty");
        renderBlogMapSummary(info);
        if (!info || info.available !== true) {
            setHidden(mapTarget, true);
            setHidden(empty, false);
            empty.textContent = "지도를 표시할 수 없습니다.";
            return Promise.resolve();
        }
        return ensureKakaoMapSdk().then(function (kakao) {
            var bounds = new kakao.maps.LatLngBounds();
            var map = new kakao.maps.Map(mapTarget, {
                center: new kakao.maps.LatLng(Number(info.destination.latitude), Number(info.destination.longitude)),
                level: 5
            });
            var originLatLng = new kakao.maps.LatLng(Number(info.origin.latitude), Number(info.origin.longitude));
            var destinationLatLng = new kakao.maps.LatLng(Number(info.destination.latitude), Number(info.destination.longitude));
            var pathPoints = [];
            state.blogMapInstance = map;
            setHidden(mapTarget, false);
            setHidden(empty, true);
            bounds.extend(originLatLng);
            bounds.extend(destinationLatLng);
            new kakao.maps.Marker({ map: map, position: originLatLng, title: "출발지" });
            new kakao.maps.Marker({ map: map, position: destinationLatLng, title: "방문지" });
            (Array.isArray(info.path) ? info.path : []).forEach(function (point) {
                if (!point) return;
                var latLng = new kakao.maps.LatLng(Number(point.latitude), Number(point.longitude));
                pathPoints.push(latLng);
                bounds.extend(latLng);
            });
            if (pathPoints.length >= 2) {
                new kakao.maps.Polyline({
                    map: map,
                    path: pathPoints,
                    strokeWeight: 5,
                    strokeColor: "#0f766e",
                    strokeOpacity: 0.9,
                    strokeStyle: "solid"
                });
            }
            map.setBounds(bounds);
            byId("blogMapMeta").textContent = "출발지 기준 예상 이동 시간 " + formatDuration(info.duration_seconds) + ", 이동 거리 " + formatDistance(info.distance_meters) + "입니다.";
        }).catch(function () {
            setHidden(mapTarget, true);
            setHidden(empty, false);
            empty.textContent = "지도를 불러오지 못했습니다. 이동 요약만 확인할 수 있습니다.";
        });
    }

    function toggleBlogMapModal(open) {
        var modal = byId("blogMapModal");
        if (!modal) return;
        modal.hidden = !open;
        if (open) renderBlogMapModal();
    }

    function lookupBlogRouteInfo() {
        var destinationAddress = byId("taskUrl") ? byId("taskUrl").value.trim() : "";
        if (!isBlogProject()) { resetBlogRouteInfo("", ""); return Promise.resolve(); }
        if (!projectOriginAddress()) { resetBlogRouteInfo("프로젝트에서 기본 출발지를 먼저 등록하세요.", "error"); return Promise.resolve(); }
        if (!destinationAddress) { resetBlogRouteInfo("방문 주소를 입력하면 이동 시간과 거리를 계산합니다.", ""); return Promise.resolve(); }
        resetBlogRouteInfo("이동 시간과 거리를 계산하고 있습니다.", "loading");
        return UX.requestJson("/task/blog-route.json", { project_id: state.projectId, destination_address: destinationAddress }).then(function (response) {
            var data = response && response.data ? response.data : {};
            if (!response || response.ok !== true || data.available !== true) {
                resetBlogRouteInfo(data.message || apiMessage(response, "이동 정보를 불러오지 못했습니다."), "error");
                return;
            }
            renderBlogRouteInfo(data);
        }).catch(function () {
            resetBlogRouteInfo("이동 정보를 불러오지 못했습니다.", "error");
        });
    }

    function scheduleBlogRouteLookup() {
        if (state.blogRouteTimer) global.clearTimeout(state.blogRouteTimer);
        state.blogRouteTimer = global.setTimeout(function () { lookupBlogRouteInfo(); }, 400);
    }

    function applyTaskFieldMode(task) {
        var isDevelopment = projectTypeCode() === "DEVELOPMENT";
        var isBlog = isBlogProject();
        var showProgress = !isBlog;
        var form = byId("taskForm");
        if (form) form.setAttribute("data-project-type", projectTypeCode());
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
            resetBlogRouteInfo("", "");
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
        if (isBlog) resetBlogRouteInfo(projectOriginAddress() ? "방문 주소를 입력하면 이동 시간과 거리를 계산합니다." : "프로젝트에서 기본 출발지를 먼저 등록하세요.", projectOriginAddress() ? "" : "error");
    }

    function renderParentTaskOptions(selectedTaskId, parentTaskId) {
        var select = byId("taskParentTaskId");
        var currentId = selectedTaskId ? String(selectedTaskId) : "";
        var selectedParentId = parentTaskId ? String(parentTaskId) : "";
        var options = ["<option value=\"\">상위 태스크 없음</option>"];
        if (!select) return;
        buildTaskRows().forEach(function (task) {
            var taskId = String(task.task_id || "");
            if (!taskId || !canAcceptChild(task, currentId)) return;
            options.push("<option value=\"" + esc(taskId) + "\">" + esc(taskOptionLabel(task)) + "</option>");
        });
        select.innerHTML = options.join("");
        select.value = selectedParentId;
    }
    function setTaskMode(mode) {
        state.taskMode = mode;
        UX.setText(byId("taskWorkspaceTitle"), "프로젝트 태스크 목록");
        UX.setText(byId("taskWorkspaceSubtitle"), mode === "form" ? "선택한 태스크를 목록 안에서 바로 수정합니다." : "목록에서 태스크를 선택하거나 새 태스크를 등록하세요.");
    }

    function buildTaskDetailRow() { return "<div class=\"task-detail-shell\"><div id=\"taskInlineEditorMount\"></div></div>"; }
    function mountTaskFormSection(formSection) {
        var mount = byId("taskInlineEditorMount");
        formSection = formSection || byId("taskFormSection");
        if (!formSection) return;
        if (!taskFormHome && formSection.parentNode) taskFormHome = formSection.parentNode;
        if (!mount) { formSection.hidden = true; if (taskFormHome && formSection.parentNode !== taskFormHome) taskFormHome.appendChild(formSection); return; }
        mount.appendChild(formSection); formSection.hidden = false;
    }
    function restoreTaskFormSection(formSection) {
        formSection = formSection || byId("taskFormSection");
        if (!formSection) return;
        if (!taskFormHome && formSection.parentNode) taskFormHome = formSection.parentNode;
        if (taskFormHome && formSection.parentNode !== taskFormHome) taskFormHome.appendChild(formSection);
        formSection.hidden = true;
    }

    function renderTaskTable() {
        var target = byId("taskRows");
        var rows = [];
        var formSection = byId("taskFormSection");
        if (!target) return;
        if (state.taskMode === "form" && !state.selectedTaskId) rows.push(buildTaskDetailRow());
        buildTaskRows().forEach(function (task) {
            var taskId = String(task.task_id || "");
            var selected = state.taskMode === "form" && taskId === String(state.selectedTaskId);
            var relationLabel = taskRelationLabel(task) || "-";
            var depth = Number(task._tree_depth || 0);
            var indent = depth * 18;
            var iconClass = depth > 0 ? "task-tree-icon is-child" : "task-tree-icon is-root";
            var summaryValue = isBlogProject() ? "업체 부담금 " + esc(task.support_amount != null ? task.support_amount : "0") : "진행률 " + esc(formatProgress(task.progress_rate));
            rows.push("<article class=\"task-card" + (selected ? " is-expanded" : "") + "\" data-task-id=\"" + esc(taskId) + "\">"
                + "<div class=\"task-card-main\" style=\"--task-tree-indent:" + esc(String(indent)) + "px\">"
                + "<div class=\"task-card-head\"><div class=\"task-card-title-wrap\"><span class=\"" + iconClass + "\" aria-hidden=\"true\"></span><div class=\"task-card-title-block\"><strong class=\"task-card-title\">" + esc(task.task_title || "-") + "</strong><span class=\"task-card-sub\">" + esc(relationLabel) + "</span></div></div><div class=\"task-card-badges\"><span class=\"status-chip status-" + esc(String(task.task_status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")) + "\">" + esc(task.task_status || "-") + "</span><span class=\"status-chip priority-" + esc(String(task.priority || "").toLowerCase()) + "\">" + esc(task.priority || "-") + "</span></div></div>"
                + "<div class=\"task-card-meta\"><span>담당자 " + esc(task.assignee_user_id || "-") + "</span><span>기간 " + esc(formatPeriod(task.start_date, task.due_date)) + "</span><span>" + summaryValue + "</span></div>"
                + "<div class=\"task-card-actions\"><button type=\"button\" class=\"task-edit-action btn" + (selected ? " is-expanded" : "") + "\" data-task-id=\"" + esc(taskId) + "\">" + (selected ? "접기" : "상세") + "</button></div></div>"
                + (selected ? buildTaskDetailRow() : "") + "</article>");
        });
        if (!rows.length) rows.push("<div class=\"detail-empty\">등록된 태스크가 없습니다.</div>");
        target.innerHTML = rows.join("");
        UX.qsa(".task-edit-action", target).forEach(function (button) {
            UX.bindOnce(button, "click", function (event) {
                var taskId = button.getAttribute("data-task-id");
                event.stopPropagation();
                if (state.taskMode === "form" && String(state.selectedTaskId) === String(taskId)) { backToTaskList(); return; }
                openTaskEditor(taskId);
            });
        });
        if (state.taskMode === "form") { mountTaskFormSection(formSection); return; }
        restoreTaskFormSection(formSection);
    }

    function renderTaskForm(task) {
        state.selectedTaskId = task && task.task_id ? String(task.task_id) : "";
        setTaskMode("form");
        byId("taskId").value = task && task.task_id ? String(task.task_id) : "";
        byId("taskTitle").value = task && task.task_title ? String(task.task_title) : "";
        byId("taskStatus").value = task && task.task_status ? String(task.task_status) : "TODO";
        byId("taskPriority").value = task && task.priority ? String(task.priority) : "MEDIUM";
        renderParentTaskOptions(task && task.task_id ? String(task.task_id) : "", task && task.parent_task_id ? String(task.parent_task_id) : "");
        byId("taskAssigneeUserId").value = task && task.assignee_user_id ? String(task.assignee_user_id) : (state.currentUser.user_id || "");
        byId("taskAssigneeDisplay").value = userLabel(task && task.assignee_user_nm ? String(task.assignee_user_nm) : (state.currentUser.user_nm || ""), task && task.assignee_user_id ? String(task.assignee_user_id) : (state.currentUser.user_id || ""));
        byId("taskStartDate").value = task && task.start_date ? String(task.start_date).slice(0, 10) : "";
        byId("taskDueDate").value = task && task.due_date ? String(task.due_date).slice(0, 10) : "";
        byId("taskProgressRate").value = task && task.progress_rate != null ? String(Math.round(Number(task.progress_rate || 0))) : "0";
        syncProgressRateLabel(byId("taskProgressRate").value);
        byId("taskDescription").value = task && task.description ? String(task.description) : "";
        applyTaskFieldMode(task);
        byId("taskParentTaskId").disabled = false;
        byId("taskMeta").innerHTML = task && task.task_id ? "<span>태스크 ID " + esc(task.task_id) + "</span><span>유형 " + esc(projectTypeCode()) + "</span><span>프로젝트 " + esc(state.project && state.project.project_name || "-") + "</span><span>상위 태스크 " + esc(task.parent_task_title || "-") + "</span>" : "<span>선택한 프로젝트 아래에 새 태스크를 등록합니다.</span>";
        if (isBlogProject() && projectOriginAddress()) byId("taskMeta").innerHTML += "<span>기본 출발지 " + esc(projectOriginAddress()) + "</span>";
        setTaskFormMessage("", "");
        renderTaskTable();
        if (isBlogProject()) scheduleBlogRouteLookup();
    }

    function backToTaskList() {
        restoreTaskFormSection(byId("taskFormSection"));
        state.selectedTaskId = "";
        setTaskMode("list");
        renderTaskTable();
        setTaskFormMessage("", "");
        toggleBlogMapModal(false);
    }

    function createTaskPayload() {
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
            actual_start_date: projectTypeCode() === "DEVELOPMENT" ? (byId("taskActualStartDate").value || null) : null,
            actual_end_date: projectTypeCode() === "DEVELOPMENT" ? (byId("taskActualEndDate").value || null) : null,
            task_url: isBlogProject() ? (byId("taskUrl").value.trim() || null) : null,
            support_amount: isBlogProject() ? (byId("taskSupportAmount").value || null) : null,
            actual_amount: isBlogProject() ? (byId("taskActualAmount").value || null) : null,
            progress_rate: isBlogProject() ? 0 : (byId("taskProgressRate").value || 0),
            description: byId("taskDescription").value.trim()
        };
    }
    function validateTaskPayload(payload) {
        if (!payload.project_id) return { message: "프로젝트 정보가 없습니다.", fieldId: "taskProjectName" };
        if (!payload.task_title) return { message: "태스크명을 입력하세요.", fieldId: "taskTitle" };
        if (!payload.assignee_user_id) return { message: "담당자를 선택하세요.", fieldId: "btnPickAssignee" };
        if (payload.start_date && payload.due_date && payload.start_date > payload.due_date) return { message: "시작일은 마감일보다 늦을 수 없습니다.", fieldId: "taskStartDate" };
        if (payload.actual_start_date && payload.actual_end_date && payload.actual_start_date > payload.actual_end_date) return { message: "실제 시작일은 실제 종료일보다 늦을 수 없습니다.", fieldId: "taskActualStartDate" };
        return null;
    }
    function clearFieldHighlight() { UX.qsa(".input.is-warning-focus, .btn.is-warning-focus").forEach(function (el) { el.classList.remove("is-warning-focus"); }); }
    function focusField(fieldId) { var target = byId(fieldId); if (!target) return; clearFieldHighlight(); target.classList.add("is-warning-focus"); target.focus(); }
    function showWarningModal(message, fieldId) { UX.showAlertModal({ title: "확인 필요", message: message, onClose: function () { if (fieldId) focusField(fieldId); } }); }

    function saveTask() {
        var payload = createTaskPayload();
        var validationMessage = validateTaskPayload(payload);
        if (validationMessage) { showWarningModal(validationMessage.message, validationMessage.fieldId); return; }
        UX.requestJson("/task/save.json", payload).then(function (response) {
            if (!response || response.ok !== true) { showWarningModal(apiMessage(response, "태스크 저장에 실패했습니다.")); return; }
            clearFieldHighlight();
            setTaskMessage("태스크가 저장되었습니다.", "success");
            backToTaskList();
            loadTasks();
        }).catch(function () { showWarningModal("태스크 저장에 실패했습니다."); });
    }

    function openTaskEditor(taskId) {
        var task = findTaskById(taskId);
        if (!task) { setTaskMessage("태스크 정보를 찾지 못했습니다.", "error"); return; }
        renderTaskForm(task);
    }

    function toggleAssigneeModal(open) {
        byId("assigneeModal").hidden = !open;
        if (open) byId("assigneeKeyword").focus();
    }

    function renderAssigneeList(items) {
        var target = byId("assigneeList");
        if (!target) return;
        if (!items || !items.length) { target.innerHTML = "<div class=\"detail-empty\">조회된 사용자가 없습니다.</div>"; return; }
        target.innerHTML = items.map(function (item) {
            return "<button type=\"button\" class=\"manager-option\" data-user-id=\"" + esc(item.user_id || "") + "\" data-user-nm=\"" + esc(item.user_nm || "") + "\"><strong>" + esc(userLabel(item.user_nm || "", item.user_id || "")) + "</strong><span>" + esc(item.user_nm || "") + "</span></button>";
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
            if (!response || response.ok !== true) { byId("assigneeList").innerHTML = "<div class=\"detail-empty\">사용자 목록을 불러오지 못했습니다.</div>"; return; }
            renderAssigneeList(Array.isArray(response.data) ? response.data : []);
        }).catch(function () { byId("assigneeList").innerHTML = "<div class=\"detail-empty\">사용자 목록을 불러오지 못했습니다.</div>"; });
    }

    function loadProject() {
        return UX.requestJson("/project/detail.json", { project_id: state.projectId }).then(function (response) {
            if (!response || response.ok !== true) { setTaskMessage(apiMessage(response, "프로젝트를 찾을 수 없습니다."), "error"); return; }
            state.project = response.data || null;
            renderProjectSummary();
            applyTaskFieldMode(null);
        }).catch(function () { setTaskMessage("프로젝트를 찾을 수 없습니다.", "error"); });
    }

    function loadTasks() {
        byId("taskRows").innerHTML = "<div class=\"detail-empty\">태스크를 불러오는 중입니다.</div>";
        return UX.requestJson("/task/list.json", { project_id: state.projectId }).then(function (response) {
            if (!response || response.ok !== true) { state.tasks = []; byId("taskRows").innerHTML = "<div class=\"detail-empty\">태스크를 불러오지 못했습니다.</div>"; return; }
            state.tasks = Array.isArray(response.data) ? response.data : [];
            renderTaskTable();
            renderParentTaskOptions(state.selectedTaskId, byId("taskParentTaskId") ? byId("taskParentTaskId").value : "");
            if (state.initialTaskId) { openTaskEditor(state.initialTaskId); state.initialTaskId = ""; }
        }).catch(function () { state.tasks = []; byId("taskRows").innerHTML = "<div class=\"detail-empty\">태스크를 불러오지 못했습니다.</div>"; });
    }

    function loadContext() {
        return Promise.all([UX.requestJson("/auth/me.json", {}), UX.requestJson("/dashboard/summary.json", {})]).then(function (results) {
            var me = results[0];
            var dashboard = results[1];
            if (!me || me.ok !== true || !dashboard || dashboard.ok !== true) { redirectToLogin(); return; }
            state.currentUser = me.data || {};
            bindInfo("currentUser", [
                { label: "아이디", value: state.currentUser.user_id || "-" },
                { label: "이름", value: state.currentUser.user_nm || "-" },
                { label: "권한", value: (state.currentUser.roles || []).join(", ") || "-" }
            ]);
            renderSummary((dashboard.data && dashboard.data.summary) || {});
        }).catch(function () { redirectToLogin(); });
    }

    function logout() { UX.requestJson("/logout.json", {}).finally(function () { UX.localRemove(["JWT", "REFRESH_TOKEN", "LOGIN_USER", "LOGIN_SESSION_ID"]); redirectToLogin(); }); }
    function isMobileViewport() { return global.matchMedia && global.matchMedia("(max-width: 768px)").matches; }
    function setSidebarOpen(open) {
        var sidebar = byId("workspaceSidebar");
        var toggle = byId("btnSidebarToggle");
        state.sidebarOpen = !!open;
        if (!sidebar || !toggle) return;
        if (isMobileViewport()) { UX.setText(toggle, state.sidebarOpen ? "닫기" : "메뉴"); sidebar.classList.toggle("is-open", state.sidebarOpen); }
        else { UX.setText(toggle, "메뉴"); sidebar.classList.remove("is-open"); }
    }
    function syncSidebarMode() { if (isMobileViewport()) { setSidebarOpen(false); return; } setSidebarOpen(true); }
    function bindEvents() {
        UX.bindOnce(byId("btnReload"), "click", function () { loadContext().then(loadProject).then(loadTasks); });
        UX.bindOnce(byId("btnLogout"), "click", logout);
        UX.bindOnce(byId("btnBackToProjects"), "click", goToProjects);
        UX.bindOnce(byId("btnOpenProject"), "click", function () { if (state.projectId) global.location.href = "/project-form.html?project_id=" + encodeURIComponent(state.projectId); });
        UX.bindOnce(byId("btnNewTask"), "click", function () { renderTaskForm(null); });
        UX.bindOnce(byId("btnBackToTaskListInline"), "click", backToTaskList);
        UX.bindOnce(byId("btnCancelTaskInline"), "click", backToTaskList);
        UX.bindOnce(byId("btnSaveTaskInline"), "click", saveTask);
        UX.bindOnce(byId("btnPickAssignee"), "click", function () { toggleAssigneeModal(true); loadAssigneeOptions(); });
        UX.bindOnce(byId("btnCloseAssigneeModal"), "click", function () { toggleAssigneeModal(false); });
        UX.bindOnce(byId("btnSearchAssignee"), "click", loadAssigneeOptions);
        UX.bindOnce(byId("assigneeModal"), "click", function (event) { if (event.target && event.target.id === "assigneeModal") toggleAssigneeModal(false); });
        UX.bindOnce(byId("assigneeKeyword"), "keydown", function (event) { if (event.key === "Enter") loadAssigneeOptions(); });
        UX.bindOnce(byId("btnSidebarToggle"), "click", function () { setSidebarOpen(!state.sidebarOpen); });
        UX.bindOnce(byId("taskProgressRate"), "input", function () { syncProgressRateLabel(byId("taskProgressRate").value); });
        UX.bindOnce(byId("taskUrl"), "input", function () { clearFieldHighlight(); scheduleBlogRouteLookup(); });
        UX.bindOnce(byId("taskUrl"), "blur", function () { lookupBlogRouteInfo(); });
        UX.bindOnce(byId("btnSearchTaskAddress"), "click", function () {
            if (!global.AddressSearch) {
                UX.showAlertModal({ title: "확인 필요", message: "주소 검색 기능을 불러오지 못했습니다." });
                return;
            }
            global.AddressSearch.open({
                title: "방문 주소 검색",
                keyword: byId("taskUrl").value.trim(),
                onSelect: function (address) {
                    byId("taskUrl").value = address || "";
                    clearFieldHighlight();
                    lookupBlogRouteInfo();
                }
            });
        });
        UX.bindOnce(byId("btnOpenBlogMap"), "click", function () { openBlogRouteInKakaoMap(); });
        UX.bindOnce(byId("btnCloseBlogMapModal"), "click", function () { toggleBlogMapModal(false); });
        UX.bindOnce(byId("blogMapModal"), "click", function (event) { if (event.target && event.target.id === "blogMapModal") toggleBlogMapModal(false); });
        ["taskTitle", "taskParentTaskId", "taskStartDate", "taskDueDate", "taskActualStartDate", "taskActualEndDate", "taskUrl", "taskSupportAmount", "taskActualAmount", "taskProjectName", "taskAssigneeDisplay", "btnPickAssignee"].forEach(function (id) {
            var target = byId(id);
            if (!target) return;
            target.addEventListener("focus", clearFieldHighlight);
            target.addEventListener("input", clearFieldHighlight);
            target.addEventListener("change", clearFieldHighlight);
            target.addEventListener("click", clearFieldHighlight);
        });
        global.addEventListener("resize", function () {
            syncSidebarMode();
            if (state.blogMapInstance && !byId("blogMapModal").hidden && global.kakao && global.kakao.maps) {
                global.kakao.maps.event.trigger(state.blogMapInstance, "resize");
            }
        });
        global.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !byId("blogMapModal").hidden) { toggleBlogMapModal(false); return; }
            if (event.key === "Escape" && !byId("assigneeModal").hidden) { toggleAssigneeModal(false); return; }
            if (event.key === "Escape" && state.taskMode === "form") backToTaskList();
        });
    }

    state.projectId = queryParam("project_id") || "";
    state.initialTaskId = queryParam("task_id") || "";

    bindEvents();
    syncSidebarMode();
    setTaskMode("list");

    if (!state.projectId) {
        UX.setText(byId("selectedProjectName"), "프로젝트를 먼저 선택하세요.");
        byId("projectSummary").innerHTML = "<span>프로젝트 목록에서 프로젝트를 선택한 뒤 진입해야 합니다.</span>";
        byId("taskRows").innerHTML = "<div class=\"detail-empty\">프로젝트 목록에서 프로젝트를 선택한 후 태스크를 관리하세요.</div>";
        byId("btnOpenProject").disabled = true;
        byId("btnNewTask").disabled = true;
        loadContext();
        return;
    }

    loadContext().then(loadProject).then(loadTasks);
})(window);
