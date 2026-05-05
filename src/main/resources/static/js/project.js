(function (global) {
    "use strict";

    var UX = global.UX;
    var state = {
        projects: [],
        sidebarOpen: false
    };
    var EMPTY_SUMMARY = {
        project_total: 0,
        project_in_progress: 0,
        task_total: 0,
        upcoming_milestone_count: 0
    };

    function redirectToLogin() {
        global.location.href = "/";
    }

    function navigateToForm(projectId) {
        global.location.href = projectId ? ("/project-form.html?project_id=" + encodeURIComponent(projectId)) : "/project-form.html";
    }

    function navigateToTasks(projectId) {
        if (!projectId) return;
        global.location.href = "/task-form.html?project_id=" + encodeURIComponent(projectId);
    }

    function navigateToMembers(projectId) {
        if (!projectId) return;
        global.location.href = "/project-member.html?project_id=" + encodeURIComponent(projectId);
    }

    function readFilters() {
        return {
            keyword: UX.byId("filterKeyword").value.trim(),
            project_status: UX.byId("filterStatus").value,
            owner_user_id: UX.byId("filterOwner").value.trim()
        };
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
            { label: "진행 중", value: summary.project_in_progress || 0 },
            { label: "전체 태스크", value: summary.task_total || 0 },
            { label: "임박 마일스톤", value: summary.upcoming_milestone_count || 0 }
        ];

        target.innerHTML = cards.map(function (card) {
            return "<article class=\"summary-card\">"
                + "<span>" + UX.esc(card.label) + "</span>"
                + "<strong>" + UX.esc(String(card.value)) + "</strong>"
                + "</article>";
        }).join("");
    }

    function statusClass(status) {
        var value = String(status || "").toLowerCase();
        return value ? ("status-" + value.replace(/[^a-z0-9]+/g, "-")) : "";
    }

    function formatPeriod(startDate, endDate) {
        return (startDate ? String(startDate) : "-") + " ~ " + (endDate ? String(endDate) : "-");
    }
    function projectStatusLabel(value) {
        var status = String(value || "PLANNING").toUpperCase();
        if (status === "READY") return "준비 완료";
        if (status === "IN_PROGRESS") return "진행 중";
        if (status === "DONE") return "완료";
        if (status === "HOLD") return "보류";
        return "기획 중";
    }

    function renderTable() {
        var target = UX.byId("projectRows");
        if (!target) return;

        if (!state.projects.length) {
            target.innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">조회된 프로젝트가 없습니다.</td></tr>";
            return;
        }

        target.innerHTML = state.projects.map(function (project) {
            var id = String(project.project_id);
            return "<tr class=\"table-row\" data-project-id=\"" + UX.esc(id) + "\">"
                + "<td><button type=\"button\" class=\"row-link\" data-project-id=\"" + UX.esc(id) + "\">"
                + "<span class=\"row-title\">" + UX.esc(project.project_name || "-") + "</span>"
                + "<span class=\"row-sub\">" + UX.esc(project.project_key || "-") + "</span>"
                + "</button><div class=\"row-actions\"><button type=\"button\" class=\"btn btn-mini project-member-action\" data-project-id=\"" + UX.esc(id) + "\">\uC0AC\uC6A9\uC790 \uAD00\uB9AC</button></div></td>"
                + "<td><span class=\"status-chip " + UX.esc(statusClass(project.project_status)) + "\">" + UX.esc(projectStatusLabel(project.project_status)) + "</span></td>"
                + "<td>" + UX.esc(formatPeriod(project.start_date, project.end_date)) + "</td>"
                + "<td>" + UX.esc(project.owner_user_id || "-") + "</td>"
                + "<td>" + UX.esc(String(project.task_count || 0)) + "</td>"
                + "<td>" + UX.esc(String(project.milestone_count || 0)) + "</td>"
                + "</tr>";
        }).join("");

        UX.qsa(".row-link", target).forEach(function (button) {
            UX.bindOnce(button, "click", function () {
                navigateToTasks(button.getAttribute("data-project-id"));
            });
        });
        UX.qsa(".project-member-action", target).forEach(function (button) {
            UX.bindOnce(button, "click", function (event) {
                event.stopPropagation();
                navigateToMembers(button.getAttribute("data-project-id"));
            });
        });
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

    function loadProjectList() {
        UX.byId("projectRows").innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">프로젝트를 조회하는 중입니다.</td></tr>";
        return UX.requestJson("/project/list.json", readFilters()).then(function (response) {
            if (!response || response.ok !== true) {
                redirectToLogin();
                return;
            }
            state.projects = Array.isArray(response.data) ? response.data : [];
            renderTable();
        }).catch(function () {
            redirectToLogin();
        });
    }

    function loadContext() {
        return UX.requestJson("/auth/me.json", {}).then(function (me) {
            if (!me || me.ok !== true) {
                redirectToLogin();
                return;
            }

            var user = me.data || {};

            bindInfo("currentUser", [
                { label: "아이디", value: user.user_id || "-" },
                { label: "이름", value: user.user_nm || "-" },
                { label: "권한", value: (user.roles || []).join(", ") || "-" }
            ]);

            return UX.requestJson("/dashboard/summary.json", {}).then(function (dashboard) {
                var summary = dashboard && dashboard.ok === true && dashboard.data ? dashboard.data.summary : null;
                renderSummary(summary || EMPTY_SUMMARY);
            }).catch(function () {
                renderSummary(EMPTY_SUMMARY);
            });
        }).catch(function () {
            redirectToLogin();
        });
    }

    function resetFilters() {
        UX.byId("filterKeyword").value = "";
        UX.byId("filterStatus").value = "";
        UX.byId("filterOwner").value = "";
        loadProjectList();
    }

    function logout() {
        UX.requestJson("/logout.json", {}).finally(function () {
            UX.localRemove(["JWT", "REFRESH_TOKEN", "LOGIN_USER", "LOGIN_SESSION_ID"]);
            redirectToLogin();
        });
    }

    function bindEvents() {
        UX.bindOnce(UX.byId("btnSearch"), "click", loadProjectList);
        UX.bindOnce(UX.byId("btnReset"), "click", resetFilters);
        UX.bindOnce(UX.byId("btnReload"), "click", function () {
            loadContext().then(loadProjectList);
        });
        UX.bindOnce(UX.byId("btnLogout"), "click", logout);
        UX.bindOnce(UX.byId("btnNewProject"), "click", function () {
            navigateToForm("");
        });
        UX.bindOnce(UX.byId("btnSidebarToggle"), "click", function () {
            setSidebarOpen(!state.sidebarOpen);
        });

        ["filterKeyword", "filterOwner"].forEach(function (id) {
            UX.bindOnce(UX.byId(id), "keydown", function (event) {
                if (event.key === "Enter") {
                    loadProjectList();
                }
            });
        });

        UX.bindOnce(UX.byId("filterStatus"), "change", loadProjectList);
        global.addEventListener("resize", syncSidebarMode);
    }
    bindEvents();
    syncSidebarMode();
    loadContext().then(loadProjectList);
})(window);
