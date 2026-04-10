(function (global) {
    "use strict";

    var UX = global.UX;
    var state = {
        sidebarOpen: false,
        currentUser: {},
        projectId: null
    };

    function redirectToLogin() {
        global.location.href = "/";
    }

    function backToList() {
        global.location.href = "/project.html";
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
            { label: "진행 중", value: summary.project_in_progress || 0 },
            { label: "전체 태스크", value: summary.task_total || 0 },
            { label: "임박 마일스톤", value: summary.upcoming_milestone_count || 0 }
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
        var target = UX.byId("projectFormMsg");
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

    function renderForm(project) {
        var isEdit = !!(project && project.project_id);

        state.projectId = isEdit ? String(project.project_id) : null;
        UX.byId("projectId").value = state.projectId || "";
        UX.byId("projectKey").value = project && project.project_key ? String(project.project_key) : "";
        UX.byId("projectName").value = project && project.project_name ? String(project.project_name) : "";
        UX.byId("projectTypeCode").value = project && project.project_type_code ? String(project.project_type_code) : "GENERAL";
        UX.byId("projectStatus").value = project && project.project_status ? String(project.project_status) : "PLANNING";
        UX.byId("projectOwner").value = project && project.owner_user_id ? String(project.owner_user_id) : (state.currentUser.user_id || "");
        UX.byId("projectOwnerDisplay").value = project
            ? managerLabel(project.owner_user_nm, project.owner_user_id)
            : managerLabel(state.currentUser.user_nm, state.currentUser.user_id);
        UX.byId("projectStartDate").value = project && project.start_date ? String(project.start_date).slice(0, 10) : "";
        UX.byId("projectEndDate").value = project && project.end_date ? String(project.end_date).slice(0, 10) : "";
        UX.byId("projectDescription").value = project && project.description ? String(project.description) : "";
        UX.setText("formPageTitle", isEdit ? "프로젝트 설정" : "신규 프로젝트 등록");
    UX.setText("formModeLabel", isEdit ? "수정" : "신규");

        UX.byId("projectMeta").innerHTML = isEdit ? [
            "<span>프로젝트 ID " + UX.esc(String(project.project_id || "-")) + "</span>",
            "<span>유형 " + UX.esc(String(project.project_type_code || "GENERAL")) + "</span>",
            "<span>태스크 " + UX.esc(String(project.task_count || 0)) + "</span>",
            "<span>마일스톤 " + UX.esc(String(project.milestone_count || 0)) + "</span>",
            "<span>멤버 " + UX.esc(String(project.member_count || 0)) + "</span>"
        ].join("") : "<span>신규 프로젝트 등록</span>";
        setFormMessage("", "");
    }

    function loadProject() {
        if (!state.projectId) {
            renderForm(null);
            return Promise.resolve();
        }

        return UX.requestJson("/project/detail.json", { project_id: state.projectId }).then(function (response) {
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
            project_id: UX.byId("projectId").value.trim() || null,
            project_key: UX.byId("projectKey").value.trim(),
            project_name: UX.byId("projectName").value.trim(),
            project_type_code: UX.byId("projectTypeCode").value,
            project_status: UX.byId("projectStatus").value,
            owner_user_id: UX.byId("projectOwner").value.trim(),
            start_date: UX.byId("projectStartDate").value || null,
            end_date: UX.byId("projectEndDate").value || null,
            description: UX.byId("projectDescription").value.trim()
        };
    }

    function clearFieldHighlight() {
        UX.qsa(".input.is-warning-focus, .btn.is-warning-focus").forEach(function (element) {
            element.classList.remove("is-warning-focus");
        });
    }

    function focusField(fieldId) {
        var target = UX.byId(fieldId);
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
        if (message.indexOf("project_key") >= 0 || message.indexOf("프로젝트 키") >= 0) return "projectKey";
        if (message.indexOf("project_name") >= 0 || message.indexOf("프로젝트명") >= 0) return "projectName";
        if (message.indexOf("project_type_code") >= 0 || message.indexOf("프로젝트 유형") >= 0) return "projectTypeCode";
        if (message.indexOf("owner_user_id") >= 0 || message.indexOf("PM") >= 0) return "btnPickManager";
        if (message.indexOf("start_date") >= 0 || message.indexOf("시작일") >= 0) return "projectStartDate";
        if (message.indexOf("end_date") >= 0 || message.indexOf("종료일") >= 0) return "projectEndDate";
        return "";
    }

    function validatePayload(payload) {
        if (!payload.project_key) {
            return { message: "프로젝트 키를 입력하세요.", fieldId: "projectKey" };
        }
        if (!payload.project_name) {
            return { message: "프로젝트명을 입력하세요.", fieldId: "projectName" };
        }
        if (!payload.owner_user_id) {
            return { message: "PM을 선택하세요.", fieldId: "btnPickManager" };
        }
        if (payload.start_date && payload.end_date && payload.start_date > payload.end_date) {
            return { message: "시작일은 종료일보다 늦을 수 없습니다.", fieldId: "projectStartDate" };
        }
        return null;
    }

    function managerLabel(userNm, userId) {
        var name = userNm || "";
        var id = userId || "";
        if (!name && !id) return "";
        if (!name) return id;
        if (!id) return name;
        return name + "(" + id + ")";
    }

    function toggleManagerModal(open) {
        var modal = UX.byId("managerModal");
        if (!modal) return;
        modal.hidden = !open;
        if (open) {
            UX.byId("managerKeyword").focus();
        }
    }

    function renderManagerList(items) {
        var target = UX.byId("managerList");
        if (!target) return;
        if (!items || !items.length) {
            target.innerHTML = "<div class=\"detail-empty\">조회된 사용자가 없습니다.</div>";
            return;
        }

        target.innerHTML = items.map(function (item) {
            var userId = item.user_id || "";
            var userNm = item.user_nm || "";
            var label = item.label || managerLabel(userNm, userId);
            return "<button type=\"button\" class=\"manager-option\" data-user-id=\"" + UX.esc(userId) + "\" data-user-nm=\"" + UX.esc(userNm) + "\">"
                + "<strong>" + UX.esc(label) + "</strong>"
                + "<span>" + UX.esc(userNm) + "</span>"
                + "</button>";
        }).join("");

        UX.qsa(".manager-option", target).forEach(function (button) {
            UX.bindOnce(button, "click", function () {
                var userId = button.getAttribute("data-user-id") || "";
                var userNm = button.getAttribute("data-user-nm") || "";
                UX.byId("projectOwner").value = userId;
                UX.byId("projectOwnerDisplay").value = managerLabel(userNm, userId);
                toggleManagerModal(false);
            });
        });
    }

    function loadManagerOptions() {
        var keyword = UX.byId("managerKeyword").value.trim();
        UX.byId("managerList").innerHTML = "<div class=\"detail-empty\">사용자 목록을 조회하는 중입니다.</div>";
        return UX.requestJson("/project/manager-options.json", { keyword: keyword }).then(function (response) {
            if (!response || response.ok !== true) {
                UX.byId("managerList").innerHTML = "<div class=\"detail-empty\">[" + UX.esc(response && response.code ? response.code : "S5000") + "] 사용자 목록을 불러오지 못했습니다.</div>";
                return;
            }
            renderManagerList(Array.isArray(response.data) ? response.data : []);
        }).catch(function () {
            UX.byId("managerList").innerHTML = "<div class=\"detail-empty\">[S5000] 사용자 목록을 불러오지 못했습니다.</div>";
        });
    }

    function saveProject() {
        var payload = createPayload();
        var validationMessage = validatePayload(payload);
        setFormMessage("", "");
        if (validationMessage) {
            showWarningModal(validationMessage.message, validationMessage.fieldId);
            return;
        }
        UX.requestJson("/project/save.json", payload).then(function (response) {
            if (!response || response.ok !== true) {
                showWarningModal(apiMessage(response, "알 수 없는 오류가 발생했습니다. 관리자에게 문의하세요."), warningFieldIdFromMessage(response && response.message));
                return;
            }
            var project = response.data || {};
            clearFieldHighlight();
            renderForm(project);
            setFormMessage("저장되었습니다.", "success");
            if (project.project_id) {
                global.history.replaceState({}, "", "/project-form.html?project_id=" + encodeURIComponent(String(project.project_id)));
            }
        }).catch(function () {
            showWarningModal("알 수 없는 오류가 발생했습니다. 관리자에게 문의하세요.");
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
        UX.bindOnce(UX.byId("btnSidebarToggle"), "click", function () {
            setSidebarOpen(!state.sidebarOpen);
        });
        UX.bindOnce(UX.byId("btnBackToList"), "click", backToList);
        UX.bindOnce(UX.byId("btnCancelProject"), "click", backToList);
        UX.bindOnce(UX.byId("btnSaveProject"), "click", saveProject);
        UX.bindOnce(UX.byId("btnPickManager"), "click", function () {
            toggleManagerModal(true);
            loadManagerOptions();
        });
        UX.bindOnce(UX.byId("btnCloseManagerModal"), "click", function () {
            toggleManagerModal(false);
        });
        UX.bindOnce(UX.byId("btnSearchManager"), "click", loadManagerOptions);
        UX.bindOnce(UX.byId("btnLogout"), "click", logout);
        UX.bindOnce(UX.byId("managerModal"), "click", function (event) {
            if (event.target && event.target.id === "managerModal") {
                toggleManagerModal(false);
            }
        });
        UX.bindOnce(UX.byId("managerKeyword"), "keydown", function (event) {
            if (event.key === "Enter") {
                loadManagerOptions();
            }
        });
        ["projectKey", "projectName", "projectTypeCode", "projectStartDate", "projectEndDate", "projectOwnerDisplay", "btnPickManager"].forEach(function (id) {
            var target = UX.byId(id);
            if (!target) return;
            target.addEventListener("focus", clearFieldHighlight);
            target.addEventListener("input", clearFieldHighlight);
            target.addEventListener("change", clearFieldHighlight);
            target.addEventListener("click", clearFieldHighlight);
        });
        global.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                toggleManagerModal(false);
            }
        });
        global.addEventListener("resize", syncSidebarMode);
    }

    state.projectId = queryParam("project_id");
    bindEvents();
    syncSidebarMode();
    loadContext().then(loadProject);
})(window);
