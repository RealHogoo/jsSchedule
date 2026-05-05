(function (global) {
    "use strict";

    var UX = global.UX;
    var state = {
        sidebarOpen: false,
        projectId: "",
        project: null,
        members: []
    };
    var EMPTY_HTML = "<div class=\"detail-empty\">";
    var EMPTY_HTML_END = "</div>";

    function byId(id) { return UX.byId(id); }
    function esc(value) { return UX.esc(value == null ? "" : String(value)); }
    function queryParam(name) { return new URLSearchParams(global.location.search).get(name); }
    function redirectToLogin() { global.location.href = "/"; }
    function goToProjects() { global.location.href = "/project.html"; }
    function goToTasks() { if (state.projectId) global.location.href = "/task-form.html?project_id=" + encodeURIComponent(state.projectId); }
    function setHtml(id, html) {
        var target = byId(id);
        if (target) target.innerHTML = html;
    }
    function emptyMessage(text) {
        return EMPTY_HTML + esc(text) + EMPTY_HTML_END;
    }
    function setMessage(text, type) {
        var target = byId("memberActionMsg");
        if (!target) return;
        target.textContent = text || "";
        target.className = "form-msg" + (type ? " is-" + type : "");
    }
    function apiMessage(response, fallback) {
        if (response && response.code && response.message) return "[" + response.code + "] " + response.message;
        if (response && response.message) return response.message;
        return fallback;
    }
    function userLabel(userNm, userId) {
        if (!userNm && !userId) return "-";
        if (!userNm) return userId;
        if (!userId) return userNm;
        return userNm + "(" + userId + ")";
    }
    function bindInfo(targetId, rows) {
        var target = byId(targetId);
        if (!target) return;
        target.innerHTML = rows.map(function (row) {
            return "<dt>" + esc(row.label) + "</dt><dd>" + esc(row.value) + "</dd>";
        }).join("");
    }
    function roleLabel(role) {
        return String(role || "MEMBER").toUpperCase() === "OWNER" ? "Owner" : "Member";
    }

    function renderProjectSummary() {
        if (!state.project) {
            UX.setText(byId("selectedProjectName"), "\uD504\uB85C\uC81D\uD2B8\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
            byId("projectSummary").innerHTML = "<span>\uC720\uD6A8\uD55C \uD504\uB85C\uC81D\uD2B8\uAC00 \uC544\uB2D9\uB2C8\uB2E4.</span>";
            return;
        }
        UX.setText(byId("selectedProjectName"), state.project.project_name || "-");
        byId("projectSummary").innerHTML = [
            "<span>\uD0A4 " + esc(state.project.project_key || "-") + "</span>",
            "<span>\uB2F4\uB2F9\uC790 " + esc(state.project.owner_user_id || "-") + "</span>",
            "<span>\uC0AC\uC6A9\uC790 " + esc(String(state.members.length || state.project.member_count || 0)) + "</span>"
        ].join("");
    }

    function renderMembers() {
        var target = byId("memberRows");
        if (!target) return;
        if (!state.members.length) {
            target.innerHTML = "<div class=\"detail-empty\">\uD3EC\uD568\uB41C \uC0AC\uC6A9\uC790\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div>";
            renderProjectSummary();
            return;
        }
        target.innerHTML = state.members.map(function (member) {
            var userId = String(member.user_id || "");
            var role = String(member.project_role || "MEMBER").toUpperCase();
            var isOwner = role === "OWNER";
            return "<article class=\"member-card\">"
                + "<div class=\"member-card-main\"><strong>" + esc(userLabel(member.user_nm || "", userId)) + "</strong><span>" + esc(userId) + "</span></div>"
                + "<div class=\"member-card-actions\"><span class=\"status-chip " + (isOwner ? "status-ready" : "status-in-progress") + "\">" + esc(roleLabel(role)) + "</span>"
                + "<button type=\"button\" class=\"btn btn-danger member-delete-action\" data-user-id=\"" + esc(userId) + "\"" + (isOwner ? " disabled" : "") + ">\uC0AD\uC81C</button></div>"
                + "</article>";
        }).join("");
        renderProjectSummary();
    }

    function renderCandidates(items) {
        var target = byId("memberCandidateList");
        if (!target) return;
        if (!items || !items.length) {
            target.innerHTML = "<div class=\"detail-empty\">\uCD94\uAC00\uD560 \uC0AC\uC6A9\uC790\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div>";
            return;
        }
        target.innerHTML = items.map(function (item) {
            return "<button type=\"button\" class=\"manager-option member-add-option\" data-user-id=\"" + esc(item.user_id || "") + "\" data-user-nm=\"" + esc(item.user_nm || "") + "\"><strong>" + esc(userLabel(item.user_nm || "", item.user_id || "")) + "</strong><span>" + esc(item.user_id || "") + "</span></button>";
        }).join("");
    }

    function loadProject() {
        return UX.requestJson("/project/detail.json", { project_id: state.projectId }).then(function (response) {
            if (!response || response.ok !== true) {
                setMessage(apiMessage(response, "\uD504\uB85C\uC81D\uD2B8\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."), "error");
                return;
            }
            state.project = response.data || null;
            renderProjectSummary();
        }).catch(function () {
            setMessage("\uD504\uB85C\uC81D\uD2B8\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.", "error");
        });
    }

    function loadMembers() {
        setHtml("memberRows", emptyMessage("\uC0AC\uC6A9\uC790\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4."));
        return UX.requestJson("/project/member/list.json", { project_id: state.projectId }).then(function (response) {
            if (!response || response.ok !== true) {
                state.members = [];
                setHtml("memberRows", emptyMessage("\uC0AC\uC6A9\uC790\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
                return;
            }
            state.members = Array.isArray(response.data) ? response.data : [];
            renderMembers();
        }).catch(function () {
            state.members = [];
            setHtml("memberRows", emptyMessage("\uC0AC\uC6A9\uC790\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
        });
    }

    function loadCandidates() {
        setHtml("memberCandidateList", emptyMessage("\uC0AC\uC6A9\uC790 \uBAA9\uB85D\uC744 \uC870\uD68C\uD558\uB294 \uC911\uC785\uB2C8\uB2E4."));
        return UX.requestJson("/project/member/candidate-options.json", {
            project_id: state.projectId,
            keyword: byId("memberKeyword").value.trim()
        }).then(function (response) {
            if (!response || response.ok !== true) {
                setHtml("memberCandidateList", emptyMessage("\uC0AC\uC6A9\uC790 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
                return;
            }
            renderCandidates(Array.isArray(response.data) ? response.data : []);
        }).catch(function () {
            setHtml("memberCandidateList", emptyMessage("\uC0AC\uC6A9\uC790 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
        });
    }

    function addMember(userId, userNm) {
        if (!userId) return;
        UX.requestJson("/project/member/add.json", { project_id: state.projectId, user_id: userId, user_nm: userNm || null }).then(function (response) {
            if (!response || response.ok !== true) {
                setMessage(apiMessage(response, "\uC0AC\uC6A9\uC790 \uCD94\uAC00\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."), "error");
                return;
            }
            setMessage("\uC0AC\uC6A9\uC790\uB97C \uCD94\uAC00\uD588\uC2B5\uB2C8\uB2E4.", "success");
            toggleMemberModal(false);
            return loadMembers();
        }).catch(function () {
            setMessage("\uC0AC\uC6A9\uC790 \uCD94\uAC00\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.", "error");
        });
    }

    function deleteMember(userId) {
        if (!userId) return;
        UX.requestJson("/project/member/delete.json", { project_id: state.projectId, user_id: userId }).then(function (response) {
            if (!response || response.ok !== true) {
                setMessage(apiMessage(response, "\uC0AC\uC6A9\uC790 \uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."), "error");
                return;
            }
            setMessage("\uC0AC\uC6A9\uC790\uB97C \uC0AD\uC81C\uD588\uC2B5\uB2C8\uB2E4.", "success");
            return loadMembers();
        }).catch(function () {
            setMessage("\uC0AC\uC6A9\uC790 \uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.", "error");
        });
    }

    function toggleMemberModal(open) {
        byId("memberModal").hidden = !open;
        if (open) {
            byId("memberKeyword").focus();
            loadCandidates();
        }
    }

    function loadContext() {
        return UX.requestJson("/auth/me.json", {}).then(function (me) {
            if (!me || me.ok !== true) {
                redirectToLogin();
                return;
            }
            var currentUser = me.data || {};
            bindInfo("currentUser", [
                { label: "\uC544\uC774\uB514", value: currentUser.user_id || "-" },
                { label: "\uC774\uB984", value: currentUser.user_nm || "-" },
                { label: "\uAD8C\uD55C", value: (currentUser.roles || []).join(", ") || "-" }
            ]);
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
    function isMobileViewport() { return global.matchMedia && global.matchMedia("(max-width: 768px)").matches; }
    function setSidebarOpen(open) {
        var sidebar = byId("workspaceSidebar");
        var toggle = byId("btnSidebarToggle");
        state.sidebarOpen = !!open;
        if (!sidebar || !toggle) return;
        if (isMobileViewport()) {
            UX.setText(toggle, state.sidebarOpen ? "\uB2EB\uAE30" : "\uBA54\uB274");
            sidebar.classList.toggle("is-open", state.sidebarOpen);
        } else {
            UX.setText(toggle, "\uBA54\uB274");
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
        UX.bindOnce(byId("btnReload"), "click", reloadPageData);
        UX.bindOnce(byId("btnLogout"), "click", logout);
        UX.bindOnce(byId("btnBackToProjects"), "click", goToProjects);
        UX.bindOnce(byId("btnOpenTasks"), "click", goToTasks);
        UX.bindOnce(byId("btnAddMember"), "click", function () { toggleMemberModal(true); });
        UX.bindOnce(byId("btnCloseMemberModal"), "click", function () { toggleMemberModal(false); });
        UX.bindOnce(byId("btnSearchMember"), "click", loadCandidates);
        UX.bindOnce(byId("memberModal"), "click", function (event) { if (event.target && event.target.id === "memberModal") toggleMemberModal(false); });
        UX.bindOnce(byId("memberRows"), "click", function (event) {
            var button = event.target && event.target.closest ? event.target.closest(".member-delete-action") : null;
            if (!button || button.disabled) return;
            deleteMember(button.getAttribute("data-user-id") || "");
        });
        UX.bindOnce(byId("memberCandidateList"), "click", function (event) {
            var button = event.target && event.target.closest ? event.target.closest(".member-add-option") : null;
            if (!button) return;
            addMember(button.getAttribute("data-user-id") || "", button.getAttribute("data-user-nm") || "");
        });
        UX.bindOnce(byId("memberKeyword"), "keydown", function (event) { if (event.key === "Enter") loadCandidates(); });
        UX.bindOnce(byId("btnSidebarToggle"), "click", function () { setSidebarOpen(!state.sidebarOpen); });
        global.addEventListener("resize", syncSidebarMode);
        global.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !byId("memberModal").hidden) toggleMemberModal(false);
        });
    }

    function reloadPageData() {
        return loadContext().then(function () {
            return Promise.all([loadProject(), loadMembers()]);
        });
    }

    state.projectId = queryParam("project_id") || "";
    bindEvents();
    syncSidebarMode();

    if (!state.projectId) {
        UX.setText(byId("selectedProjectName"), "\uD504\uB85C\uC81D\uD2B8\uB97C \uBA3C\uC800 \uC120\uD0DD\uD558\uC138\uC694.");
        setHtml("projectSummary", "<span>\uD504\uB85C\uC81D\uD2B8 \uBAA9\uB85D\uC5D0\uC11C \uD504\uB85C\uC81D\uD2B8\uB97C \uC120\uD0DD\uD55C \uB4A4 \uC9C4\uC785\uD574\uC57C \uD569\uB2C8\uB2E4.</span>");
        setHtml("memberRows", emptyMessage("\uD504\uB85C\uC81D\uD2B8\uB97C \uBA3C\uC800 \uC120\uD0DD\uD558\uC138\uC694."));
        UX.setDisabled(byId("btnOpenTasks"), true);
        UX.setDisabled(byId("btnAddMember"), true);
        loadContext();
        return;
    }

    reloadPageData();
})(window);
