
(function (global) {
    "use strict";

    var UX = global.UX;
    var state = {
        sidebarOpen: false,
        currentUser: {},
        summary: {},
        projects: [],
        selectedProjectId: "",
        selectedProject: null,
        projectDetail: null,
        tasks: [],
        nodeRollups: [],
        monthlyChart: null
    };

    function byId(id) { return UX.byId(id); }
    function esc(value) { return UX.esc(value == null ? "" : String(value)); }
    function redirectToLogin() { global.location.href = "/"; }
    function number(value) { var n = Number(value || 0); return isNaN(n) ? 0 : n; }
    function formatCount(value) { return String(Math.round(number(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
    function formatPercent(value) { return formatCount(value) + "%"; }
    function formatMoney(value) { return formatCount(value) + "\uC6D0"; }
    function formatDate(value) { return value ? String(value).slice(0, 10) : "-"; }
    function formatPeriod(start, end) { return formatDate(start) + " ~ " + formatDate(end); }
    function parseDate(value) { return value ? new Date(String(value).slice(0, 10) + "T00:00:00") : null; }
    function today() { var now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
    function pad(value) { return String(value).padStart(2, "0"); }
    function monthKey(date) { return date.getFullYear() + "-" + pad(date.getMonth() + 1); }
    function moveToTask(projectId, taskId) {
        if (!projectId) return;
        global.location.href = "/task-form.html?project_id=" + encodeURIComponent(projectId)
            + (taskId ? "&task_id=" + encodeURIComponent(taskId) : "");
    }
    function typeLabel(type) {
        if (type === "DEVELOPMENT") return "\uAC1C\uBC1C";
        if (type === "BLOG") return "\uBE14\uB85C\uADF8";
        return "\uC77C\uBC18";
    }
    function statusLabel(status) {
        var value = String(status || "TODO").toUpperCase();
        if (value === "IN_PROGRESS") return "\uC9C4\uD589 \uC911";
        if (value === "DONE") return "\uC644\uB8CC";
        if (value === "HOLD") return "\uBCF4\uB958";
        return "\uD560 \uC77C";
    }
    function projectStatusLabel(status) {
        var value = String(status || "PLANNING").toUpperCase();
        if (value === "READY") return "\uC900\uBE44 \uC644\uB8CC";
        if (value === "IN_PROGRESS") return "\uC9C4\uD589 \uC911";
        if (value === "DONE") return "\uC644\uB8CC";
        if (value === "HOLD") return "\uBCF4\uB958";
        return "\uAE30\uD68D \uC911";
    }
    function priorityLabel(priority) {
        var value = String(priority || "MEDIUM").toUpperCase();
        if (value === "HIGH") return "\uB192\uC74C";
        if (value === "LOW") return "\uB0AE\uC74C";
        return "\uBCF4\uD1B5";
    }
    function insightConfig(type) {
        if (type === "BLOG") {
            return {
                guide: "\uBE14\uB85C\uADF8\uB294 \uC5C5\uCCB4 \uBD80\uB2F4\uAE08\uACFC \uCD94\uAC00 \uACB0\uC81C\uAE08\uC744 \uC911\uC2EC\uC73C\uB85C \uBCF4\uACE0, \uC6D4\uBCC4 \uD750\uB984\uC740 \uB9C8\uAC10\uC77C \uAE30\uC900\uC73C\uB85C \uC9D1\uACC4\uD569\uB2C8\uB2E4.",
                statusTitle: "\uAE08\uC561 \uD604\uD669",
                statusCopy: "\uC5C5\uCCB4 \uBD80\uB2F4\uAE08\uACFC \uCD94\uAC00 \uACB0\uC81C\uAE08 \uD569\uACC4\uB97C \uBE44\uAD50\uD569\uB2C8\uB2E4.",
                monthlyTitle: "\uC6D4\uBCC4 \uD0DC\uC2A4\uD06C \uD750\uB984",
                monthlyCopy: "\uCD5C\uADFC 12\uAC1C\uC6D4 \uD0DC\uC2A4\uD06C \uD750\uB984\uC744 \uBCF4\uC5EC\uC90D\uB2C8\uB2E4."
            };
        }
        if (type === "DEVELOPMENT") {
            return {
                guide: "\uAC1C\uBC1C\uC740 \uC9C0\uC5F0 \uD0DC\uC2A4\uD06C \uBE44\uC728\uACFC \uAC74\uC218, \uC6D4\uBCC4 \uD750\uB984\uC740 \uC2E4\uC81C \uC885\uB8CC\uC77C \uC6B0\uC120 \uAE30\uC900\uC73C\uB85C \uBCF4\uC5EC\uC90D\uB2C8\uB2E4.",
                statusTitle: "\uC0C1\uD0DC \uBD84\uD3EC",
                statusCopy: "\uD604\uC7AC \uAC1C\uBC1C \uD0DC\uC2A4\uD06C \uC0C1\uD0DC \uAD6C\uC131\uC744 \uD655\uC778\uD569\uB2C8\uB2E4.",
                monthlyTitle: "\uC6D4\uBCC4 \uD0DC\uC2A4\uD06C \uD750\uB984",
                monthlyCopy: "\uCD5C\uADFC 12\uAC1C\uC6D4 \uD0DC\uC2A4\uD06C \uD750\uB984\uC744 \uBCF4\uC5EC\uC90D\uB2C8\uB2E4."
            };
        }
        return {
            guide: "\uC77C\uBC18\uC740 \uD0DC\uC2A4\uD06C \uAC74\uC218\uC640 \uD3C9\uADE0 \uC9C4\uD589\uB960\uC744 \uC911\uC2EC\uC73C\uB85C \uBCF4\uACE0, \uC6D4\uBCC4 \uD750\uB984\uC740 \uB9C8\uAC10\uC77C \uAE30\uC900\uC73C\uB85C \uC9D1\uACC4\uD569\uB2C8\uB2E4.",
            statusTitle: "\uC0C1\uD0DC \uBD84\uD3EC",
            statusCopy: "\uD604\uC7AC \uD0DC\uC2A4\uD06C \uC0C1\uD0DC \uAD6C\uC131\uC744 \uD655\uC778\uD569\uB2C8\uB2E4.",
            monthlyTitle: "\uC6D4\uBCC4 \uD0DC\uC2A4\uD06C \uD750\uB984",
            monthlyCopy: "\uCD5C\uADFC 12\uAC1C\uC6D4 \uD0DC\uC2A4\uD06C \uD750\uB984\uC744 \uBCF4\uC5EC\uC90D\uB2C8\uB2E4."
        };
    }
    function taskStats(tasks) {
        var stats = { total: tasks.length, done: 0, inProgress: 0, todo: 0, hold: 0, overdue: 0, avgProgress: 0, supportTotal: 0, actualTotal: 0 };
        tasks.forEach(function (task) {
            var status = String(task.task_status || "");
            if (status === "DONE") stats.done += 1;
            else if (status === "IN_PROGRESS") stats.inProgress += 1;
            else if (status === "HOLD") stats.hold += 1;
            else stats.todo += 1;
            if (task.due_date && status !== "DONE" && parseDate(task.due_date) < today()) stats.overdue += 1;
            stats.avgProgress += number(task.progress_rate);
            stats.supportTotal += number(task.support_amount);
            stats.actualTotal += number(task.actual_amount);
        });
        stats.avgProgress = tasks.length ? Math.round(stats.avgProgress / tasks.length) : 0;
        return stats;
    }
    function bindInfo(targetId, rows) {
        var target = byId(targetId);
        if (!target) return;
        target.innerHTML = rows.map(function (row) { return "<dt>" + esc(row.label) + "</dt><dd>" + esc(row.value) + "</dd>"; }).join("");
    }
    function childTasksOf(parentId, tasks) {
        return tasks.filter(function (task) {
            return String(task.parent_task_id || "") === String(parentId || "");
        });
    }
    function descendantTasksOf(parentId, tasks) {
        var directChildren = childTasksOf(parentId, tasks);
        return directChildren.reduce(function (list, child) {
            return list.concat(child, descendantTasksOf(child.task_id, tasks));
        }, []);
    }
    function aggregateChildTasks(tasks) {
        return tasks.reduce(function (summary, task) {
            var status = String(task.task_status || "TODO").toUpperCase();
            var overdue = task.due_date && status !== "DONE" && parseDate(task.due_date) < today();
            if (status === "DONE") summary.doneCount += 1;
            if (status === "IN_PROGRESS") summary.inProgressCount += 1;
            if (overdue) summary.overdueCount += 1;
            summary.supportAmountTotal += number(task.support_amount);
            summary.actualAmountTotal += number(task.actual_amount);
            return summary;
        }, {
            childCount: tasks.length,
            doneCount: 0,
            inProgressCount: 0,
            overdueCount: 0,
            supportAmountTotal: 0,
            actualAmountTotal: 0
        });
    }
    function buildTaskNodeRollupsFromTasks(tasks) {
        return tasks.filter(function (task) {
            return !task.parent_task_id;
        }).map(function (task) {
            return {
                taskId: task.task_id,
                taskTitle: task.task_title || "-",
                rollup: aggregateChildTasks(descendantTasksOf(task.task_id, tasks))
            };
        }).filter(function (item) {
            return item.rollup.childCount > 0;
        });
    }
    function renderGroupCharts(rollup) {
        var statusTotal = Math.max(1, rollup.doneCount + rollup.inProgressCount + rollup.overdueCount);
        var moneyTotal = Math.max(1, rollup.supportAmountTotal + rollup.actualAmountTotal);
        return "<div class=\"dashboard-group-chart\">"
            + "<div class=\"dashboard-group-chart-row\">"
            + "<div class=\"dashboard-group-legend\">"
            + "<span class=\"dashboard-group-chip is-done\">완료 " + esc(formatCount(rollup.doneCount)) + "</span>"
            + "<span class=\"dashboard-group-chip is-progress\">진행 " + esc(formatCount(rollup.inProgressCount)) + "</span>"
            + "<span class=\"dashboard-group-chip is-overdue\">지연 " + esc(formatCount(rollup.overdueCount)) + "</span>"
            + "</div>"
            + "<div class=\"dashboard-group-track is-status\">"
            + "<span class=\"dashboard-group-fill is-done\" style=\"width:" + esc(String(Math.round((rollup.doneCount / statusTotal) * 100))) + "%\"></span>"
            + "<span class=\"dashboard-group-fill is-progress\" style=\"width:" + esc(String(Math.round((rollup.inProgressCount / statusTotal) * 100))) + "%\"></span>"
            + "<span class=\"dashboard-group-fill is-overdue\" style=\"width:" + esc(String(Math.round((rollup.overdueCount / statusTotal) * 100))) + "%\"></span>"
            + "</div>"
            + "</div>"
            + "<div class=\"dashboard-group-chart-row\">"
            + "<div class=\"dashboard-group-legend\">"
            + "<span class=\"dashboard-group-chip is-support\">지원금액 " + esc(formatMoney(rollup.supportAmountTotal)) + "</span>"
            + "<span class=\"dashboard-group-chip is-actual\">사용금액 " + esc(formatMoney(rollup.actualAmountTotal)) + "</span>"
            + "</div>"
            + "<div class=\"dashboard-group-track is-money\">"
            + "<span class=\"dashboard-group-fill is-support\" style=\"width:" + esc(String(Math.round((rollup.supportAmountTotal / moneyTotal) * 100))) + "%\"></span>"
            + "<span class=\"dashboard-group-fill is-actual\" style=\"width:" + esc(String(Math.round((rollup.actualAmountTotal / moneyTotal) * 100))) + "%\"></span>"
            + "</div>"
            + "</div>";
    }
    function renderSummary(summary) {
        var target = byId("summaryCards");
        var cards;
        if (!target) return;
        cards = [
            { label: "\uD504\uB85C\uC81D\uD2B8", value: summary.project_total || 0 },
            { label: "\uD0DC\uC2A4\uD06C", value: summary.task_total || 0 },
            { label: "\uC9C4\uD589\uC911", value: summary.task_in_progress || 0 },
            { label: "\uC9C0\uC5F0", value: summary.overdue_task_count || 0 }
        ];
        target.innerHTML = cards.map(function (card) {
            return "<article class=\"summary-card\"><span>" + esc(card.label) + "</span><strong>" + esc(formatCount(card.value)) + "</strong></article>";
        }).join("");
    }
    function selectedProjectType() { return state.selectedProject ? String(state.selectedProject.project_type_code || "GENERAL") : "GENERAL"; }
    function applyInsightCopy() {
        var config = insightConfig(selectedProjectType());
        var guide = byId("typeGuide");
        var riskPanel = byId("riskList");
        var recentPanel = byId("taskBoard");
        if (guide) guide.innerHTML = "<strong>\uD575\uC2EC \uB370\uC774\uD130 \uAE30\uC900</strong><p>" + esc(config.guide) + "</p>";
        UX.setText(byId("statusPanelTitle"), config.statusTitle);
        UX.setText(byId("statusPanelCopy"), config.statusCopy);
        UX.setText(byId("monthlyPanelTitle"), config.monthlyTitle);
        UX.setText(byId("monthlyPanelCopy"), config.monthlyCopy);
        if (riskPanel) {
            UX.setText(riskPanel.parentNode.querySelector(".panel-title"), "\uC9C0\uC5F0 \uD0DC\uC2A4\uD06C");
            UX.setText(riskPanel.parentNode.querySelector(".table-copy"), "\uC9C0\uC5F0 \uD0DC\uC2A4\uD06C\uC640 \uBCF4\uB958 \uD0DC\uC2A4\uD06C\uB97C \uD568\uAED8 \uD655\uC778\uD569\uB2C8\uB2E4.");
        }
        if (recentPanel) {
            UX.setText(recentPanel.parentNode.querySelector(".panel-title"), "\uCD5C\uADFC \uD0DC\uC2A4\uD06C");
            UX.setText(recentPanel.parentNode.querySelector(".table-copy"), "\uCD5C\uADFC \uBCC0\uACBD\uB418\uC5C8\uAC70\uB098 \uB9C8\uAC10\uC774 \uAC00\uAE4C\uC6B4 \uD0DC\uC2A4\uD06C\uB97C \uD655\uC778\uD569\uB2C8\uB2E4.");
        }
    }
    function renderProjectSelector() {
        var select = byId("filterProject");
        if (!select) return;
        if (!state.projects.length) {
            select.innerHTML = "<option value=\"\">\uD504\uB85C\uC81D\uD2B8 \uC5C6\uC74C</option>";
            return;
        }
        select.innerHTML = state.projects.map(function (project) {
            return "<option value=\"" + esc(project.project_id) + "\"" + (String(project.project_id) === String(state.selectedProjectId) ? " selected" : "") + ">"
                + esc((project.project_key || "P") + " - " + (project.project_name || "-"))
                + "</option>";
        }).join("");
    }
    function renderProjectHero() {
        var target = byId("projectHero");
        var project = state.projectDetail || state.selectedProject;
        var type = selectedProjectType();
        var stats = taskStats(state.tasks);
        var mainMetricText;
        var subMetricText;
        if (!target) return;
        if (!project) {
            target.innerHTML = "<div class=\"detail-empty\">\uD504\uB85C\uC81D\uD2B8\uB97C \uC120\uD0DD\uD558\uBA74 \uB300\uC2DC\uBCF4\uB4DC\uAC00 \uD45C\uC2DC\uB429\uB2C8\uB2E4.</div>";
            return;
        }
        if (type === "BLOG") {
            mainMetricText = "\uC5C5\uCCB4 \uBD80\uB2F4\uAE08 " + formatMoney(stats.supportTotal);
            subMetricText = "\uCD94\uAC00 \uACB0\uC81C\uAE08 " + formatMoney(stats.actualTotal);
        } else if (type === "DEVELOPMENT") {
            mainMetricText = "\uC9C0\uC5F0 \uBE44\uC728 " + formatPercent(stats.total ? Math.round((stats.overdue / stats.total) * 100) : 0);
            subMetricText = "\uC9C0\uC5F0 \uAC74\uC218 " + formatCount(stats.overdue) + "\uAC74";
        } else {
            mainMetricText = "\uD0DC\uC2A4\uD06C " + formatCount(stats.total) + "\uAC74";
            subMetricText = "\uD3C9\uADE0 \uC9C4\uD589\uB960 " + formatPercent(stats.avgProgress);
        }
        target.innerHTML = "<div class=\"dashboard-project-hero-main\"><div><div class=\"hero-kicker\">" + esc(typeLabel(type)) + " \uD504\uB85C\uC81D\uD2B8</div><h3 class=\"dashboard-project-title\">" + esc(project.project_name || "-") + "</h3><p class=\"workspace-copy dashboard-project-copy\">" + esc(project.description || "\uD504\uB85C\uC81D\uD2B8 \uC124\uBA85\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.") + "</p></div><div class=\"dashboard-project-badges\"><span class=\"status-chip\">" + esc(project.project_key || "-") + "</span><span class=\"status-chip\">" + esc(typeLabel(type)) + "</span><span class=\"status-chip status-" + esc(String(project.project_status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")) + "\">" + esc(projectStatusLabel(project.project_status)) + "</span></div></div>"
            + "<div class=\"dashboard-project-meta-grid\"><article><span>\uAE30\uAC04</span><strong>" + esc(formatPeriod(project.start_date, project.end_date)) + "</strong></article><article><span>\uB2F4\uB2F9\uC790</span><strong>" + esc(project.owner_user_id || "-") + "</strong></article><article><span>\uAD6C\uC131\uC6D0</span><strong>" + esc(formatCount(project.member_count || 0)) + "\uBA85</strong></article><article><span>\uB9C8\uC77C\uC2A4\uD1A4</span><strong>" + esc(formatCount(project.milestone_count || 0)) + "\uAC74</strong></article><article><span>\uD575\uC2EC \uC9C0\uD45C</span><strong>" + esc(mainMetricText) + "</strong></article><article><span>\uBCF4\uC870 \uC9C0\uD45C</span><strong>" + esc(subMetricText) + "</strong></article></div>";
    }
    function renderMetricCards() {
        var target = byId("projectMetricCards");
        var stats = taskStats(state.tasks);
        var type = selectedProjectType();
        var cards;
        if (!target) return;
        if (type === "BLOG") {
            cards = [
                { label: "\uC5C5\uCCB4 \uBD80\uB2F4\uAE08 \uCD1D\uC561", value: formatMoney(stats.supportTotal), tone: "focus" },
                { label: "\uCD94\uAC00 \uACB0\uC81C\uAE08 \uCD1D\uC561", value: formatMoney(stats.actualTotal), tone: "neutral" },
                { label: "\uCC28\uC561", value: formatMoney(stats.supportTotal - stats.actualTotal), tone: "good" },
                { label: "\uD0DC\uC2A4\uD06C", value: formatCount(stats.total) + "\uAC74", tone: "neutral" },
                { label: "\uC644\uB8CC", value: formatCount(stats.done) + "\uAC74", tone: "good" },
                { label: "\uC9C0\uC5F0", value: formatCount(stats.overdue) + "\uAC74", tone: "danger" }
            ];
        } else if (type === "DEVELOPMENT") {
            cards = [
                { label: "\uC9C0\uC5F0 \uD0DC\uC2A4\uD06C \uBE44\uC728", value: formatPercent(stats.total ? Math.round((stats.overdue / stats.total) * 100) : 0), tone: "danger" },
                { label: "\uC9C0\uC5F0 \uD0DC\uC2A4\uD06C \uAC74\uC218", value: formatCount(stats.overdue) + "\uAC74", tone: "danger" },
                { label: "\uC9C4\uD589 \uC911", value: formatCount(stats.inProgress) + "\uAC74", tone: "focus" },
                { label: "\uC644\uB8CC", value: formatCount(stats.done) + "\uAC74", tone: "good" },
                { label: "\uD3C9\uADE0 \uC9C4\uD589\uB960", value: formatPercent(stats.avgProgress), tone: "focus" },
                { label: "\uC804\uCCB4 \uD0DC\uC2A4\uD06C", value: formatCount(stats.total) + "\uAC74", tone: "neutral" }
            ];
        } else {
            cards = [
                { label: "\uD0DC\uC2A4\uD06C \uAC74\uC218", value: formatCount(stats.total) + "\uAC74", tone: "neutral" },
                { label: "\uD3C9\uADE0 \uC9C4\uD589\uB960", value: formatPercent(stats.avgProgress), tone: "focus" },
                { label: "\uC644\uB8CC", value: formatCount(stats.done) + "\uAC74", tone: "good" },
                { label: "\uC9C4\uD589 \uC911", value: formatCount(stats.inProgress) + "\uAC74", tone: "focus" },
                { label: "\uBBF8\uC644\uB8CC", value: formatCount(Math.max(0, stats.total - stats.done)) + "\uAC74", tone: "neutral" },
                { label: "\uC9C0\uC5F0", value: formatCount(stats.overdue) + "\uAC74", tone: "danger" }
            ];
        }
        target.innerHTML = cards.map(function (card) { return "<article class=\"dashboard-metric-card tone-" + esc(card.tone) + "\"><span>" + esc(card.label) + "</span><strong>" + esc(card.value) + "</strong></article>"; }).join("");
    }
    function renderNodeRollups() {
        var target = byId("nodeRollupList");
        var panel;
        var statusPanel;
        var title;
        if (!target) return;
        panel = target.closest ? target.closest(".panel") : null;
        statusPanel = byId("statusChart");
        statusPanel = statusPanel && statusPanel.closest ? statusPanel.closest(".panel") : null;
        if (panel && statusPanel && statusPanel.parentNode === panel.parentNode && panel.previousElementSibling !== statusPanel) {
            statusPanel.insertAdjacentElement("afterend", panel);
        }
        title = target.parentNode ? target.parentNode.querySelector(".panel-title") : null;
        UX.setText(title, "\uADF8\uB8F9\uBCC4 \uC9D1\uACC4");
        if (!state.selectedProjectId) {
            target.innerHTML = "<div class=\"detail-empty\">\uD504\uB85C\uC81D\uD2B8\uB97C \uC120\uD0DD\uD558\uBA74 \uADF8\uB8F9\uBCC4 \uC9D1\uACC4\uAC00 \uD45C\uC2DC\uB429\uB2C8\uB2E4.</div>";
            return;
        }
        if (!state.nodeRollups.length) {
            target.innerHTML = "<div class=\"detail-empty\">\uD45C\uC2DC\uD560 \uD558\uC704 \uD0DC\uC2A4\uD06C \uC9D1\uACC4 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div>";
            return;
        }
        target.innerHTML = state.nodeRollups.map(function (taskRollup) {
            return "<article class=\"dashboard-node-task-card\">"
                + "<div class=\"dashboard-node-task-head\"><strong>" + esc(taskRollup.taskTitle) + "</strong></div>"
                + renderGroupCharts(taskRollup.rollup)
                + "</article>";
        }).join("");
    }
    function statusColor(status) {
        if (status === "DONE") return "#16a34a";
        if (status === "IN_PROGRESS") return "#d97706";
        if (status === "HOLD") return "#dc2626";
        return "#475569";
    }
    function renderStatusChart() {
        var target = byId("statusChart");
        var stats = taskStats(state.tasks);
        var type = selectedProjectType();
        var total = Math.max(stats.total, 1);
        var segments;
        var totalMoney;
        if (!target) return;
        if (type === "BLOG") {
            totalMoney = Math.max(1, stats.supportTotal, stats.actualTotal);
            target.innerHTML = "<div class=\"dashboard-bar-list\">"
                + "<article class=\"dashboard-bar-row\"><div class=\"dashboard-bar-head\"><span>\uC5C5\uCCB4 \uBD80\uB2F4\uAE08 \uCD1D\uC561</span><strong>" + esc(formatMoney(stats.supportTotal)) + "</strong></div><div class=\"dashboard-bar-track\"><span class=\"dashboard-bar-fill\" style=\"width:" + esc(String(Math.round((stats.supportTotal / totalMoney) * 100))) + "%\"></span></div></article>"
                + "<article class=\"dashboard-bar-row\"><div class=\"dashboard-bar-head\"><span>\uCD94\uAC00 \uACB0\uC81C\uAE08 \uCD1D\uC561</span><strong>" + esc(formatMoney(stats.actualTotal)) + "</strong></div><div class=\"dashboard-bar-track\"><span class=\"dashboard-bar-fill\" style=\"width:" + esc(String(Math.round((stats.actualTotal / totalMoney) * 100))) + "%;background:linear-gradient(135deg, #ea580c 0%, #f97316 100%)\"></span></div></article></div>";
            return;
        }
        segments = [
            { label: statusLabel("TODO"), value: stats.todo, color: statusColor("TODO") },
            { label: statusLabel("IN_PROGRESS"), value: stats.inProgress, color: statusColor("IN_PROGRESS") },
            { label: statusLabel("DONE"), value: stats.done, color: statusColor("DONE") },
            { label: statusLabel("HOLD"), value: stats.hold, color: statusColor("HOLD") }
        ];
        target.innerHTML = "<div class=\"dashboard-stack-bar\">"
            + segments.map(function (segment) { return "<span class=\"dashboard-stack-segment\" style=\"width:" + esc(String(Math.max(4, Math.round((segment.value / total) * 100)))) + "%;background:" + esc(segment.color) + "\"></span>"; }).join("")
            + "</div><div class=\"dashboard-legend-grid\">"
            + segments.map(function (segment) { return "<article class=\"dashboard-legend-item\"><span class=\"dashboard-dot\" style=\"background:" + esc(segment.color) + "\"></span><strong>" + esc(segment.label) + "</strong><em>" + esc(formatCount(segment.value)) + "\uAC74</em></article>"; }).join("")
            + "</div>";
    }
    function getTaskBasisMonth(task, type) {
        var basis = type === "DEVELOPMENT" ? (task.actual_end_date || task.due_date || task.start_date) : (task.due_date || task.start_date);
        return basis ? String(basis).slice(0, 7) : "";
    }
    function monthlyTrendStats() {
        var type = selectedProjectType();
        var map = {};
        var months = [];
        var now = today();
        var index;
        var cursor;
        state.tasks.forEach(function (task) {
            var key = getTaskBasisMonth(task, type);
            if (!key) return;
            if (!map[key]) {
                map[key] = { month: key, total: 0, done: 0, inProgress: 0, main: 0, sub: 0 };
            }
            map[key].total += 1;
            if (String(task.task_status || "") === "DONE") {
                map[key].done += 1;
            } else {
                map[key].inProgress += 1;
            }
            if (type === "BLOG") {
                map[key].main += number(task.support_amount);
                map[key].sub += number(task.actual_amount);
            } else if (type === "DEVELOPMENT") {
                if (task.due_date && String(task.task_status || "") !== "DONE" && parseDate(task.due_date) < today()) {
                    map[key].sub += 1;
                }
            } else {
                map[key].main += number(task.progress_rate);
            }
        });
        for (index = 11; index >= 0; index--) {
            cursor = new Date(now.getFullYear(), now.getMonth() - index, 1);
            months.push(monthKey(cursor));
        }
        return months.map(function (key) {
            var row = map[key] || { month: key, total: 0, done: 0, inProgress: 0, main: 0, sub: 0 };
            if (type === "DEVELOPMENT") {
                row.main = row.total ? Math.round((row.sub / row.total) * 100) : 0;
            } else if (type === "GENERAL") {
                row.main = row.total ? Math.round(row.main / row.total) : 0;
                row.sub = row.total;
            }
            return row;
        });
    }
    function monthlyMetricLabels(type) {
        if (type === "BLOG") {
            return {
                main: "\uD575\uC2EC \uC9C0\uD45C(\uC5C5\uCCB4 \uBD80\uB2F4\uAE08)",
                sub: "\uBCF4\uC870 \uC9C0\uD45C(\uCD94\uAC00 \uACB0\uC81C\uAE08)"
            };
        }
        if (type === "DEVELOPMENT") {
            return {
                main: "\uD575\uC2EC \uC9C0\uD45C(\uC9C0\uC5F0 \uBE44\uC728)",
                sub: "\uBCF4\uC870 \uC9C0\uD45C(\uC9C0\uC5F0 \uAC74\uC218)"
            };
        }
        return {
            main: "\uD575\uC2EC \uC9C0\uD45C(\uD3C9\uADE0 \uC9C4\uD589\uB960)",
            sub: "\uBCF4\uC870 \uC9C0\uD45C(\uD0DC\uC2A4\uD06C \uAC74\uC218)"
        };
    }
    function monthlyMetricAxisName(type) {
        if (type === "BLOG") return "\uAE08\uC561(\uC6D0)";
        if (type === "DEVELOPMENT") return "\uC9C0\uD45C(% / \uAC74)";
        return "\uC9C0\uD45C(% / \uAC74)";
    }
    function renderMonthlyTrendChart() {
        var target = byId("monthlyTrendChart");
        var rows = monthlyTrendStats();
        var echarts = global.echarts;
        var type = selectedProjectType();
        var labels = monthlyMetricLabels(type);
        var metricAxisName = monthlyMetricAxisName(type);
        if (!target) return;
        if (state.monthlyChart) {
            state.monthlyChart.dispose();
            state.monthlyChart = null;
        }
        if (!echarts) {
            target.innerHTML = "<div class=\"detail-empty\">\uCC28\uD2B8 \uB77C\uC774\uBE0C\uB7EC\uB9AC\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.</div>";
            return;
        }
        target.innerHTML = "<div id=\"monthlyTrendCanvas\" class=\"dashboard-chart-canvas-wrap\"></div>";
        state.monthlyChart = echarts.init(byId("monthlyTrendCanvas"));
        state.monthlyChart.setOption({
            animationDuration: 450,
            color: ["#d97706", "#16a34a", "#2563eb", "#7c3aed"],
            grid: { left: 52, right: 64, top: 54, bottom: 34 },
            legend: {
                top: 10,
                itemWidth: 12,
                itemHeight: 12,
                textStyle: { color: "#334155", fontSize: 12, fontWeight: 700 }
            },
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "shadow" },
                backgroundColor: "rgba(15, 23, 42, 0.92)",
                borderWidth: 0,
                textStyle: { color: "#e2e8f0" }
            },
            xAxis: {
                type: "category",
                data: rows.map(function (row) { return row.month; }),
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "#cbd5e1" } },
                axisLabel: { color: "#64748b", fontSize: 11, fontWeight: 700 }
            },
            yAxis: [
                {
                    type: "value",
                    name: "\uD0DC\uC2A4\uD06C \uAC74\uC218",
                    minInterval: 1,
                    axisLabel: { color: "#64748b" },
                    nameTextStyle: { color: "#475569", fontWeight: 700 },
                    splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.24)" } }
                },
                {
                    type: "value",
                    name: metricAxisName,
                    axisLabel: { color: "#2563eb" },
                    nameTextStyle: { color: "#2563eb", fontWeight: 700 },
                    splitLine: { show: false }
                }
            ],
            series: [
                {
                    name: "\uC9C4\uD589\uC911",
                    type: "bar",
                    stack: "taskFlow",
                    barWidth: 26,
                    yAxisIndex: 0,
                    emphasis: { focus: "series" },
                    itemStyle: { borderRadius: [8, 8, 0, 0] },
                    data: rows.map(function (row) { return row.inProgress; })
                },
                {
                    name: "\uC644\uB8CC",
                    type: "bar",
                    stack: "taskFlow",
                    barWidth: 26,
                    yAxisIndex: 0,
                    emphasis: { focus: "series" },
                    itemStyle: { borderRadius: [8, 8, 0, 0] },
                    data: rows.map(function (row) { return row.done; })
                },
                {
                    name: labels.main,
                    type: "line",
                    yAxisIndex: 1,
                    smooth: 0.28,
                    symbol: "circle",
                    symbolSize: 9,
                    lineStyle: { width: 3 },
                    itemStyle: { borderWidth: 2, borderColor: "#ffffff" },
                    data: rows.map(function (row) { return row.main; })
                },
                {
                    name: labels.sub,
                    type: "line",
                    yAxisIndex: 1,
                    smooth: 0.28,
                    symbol: "circle",
                    symbolSize: 9,
                    lineStyle: { width: 3, type: "dashed" },
                    itemStyle: { borderWidth: 2, borderColor: "#ffffff" },
                    data: rows.map(function (row) { return row.sub; })
                }
            ]
        });
    }
    function renderTimelineChart() {
        var target = byId("timelineChart");
        var rows = state.tasks.slice().filter(function (task) { return task.start_date || task.due_date; }).sort(function (a, b) { return String(a.due_date || "9999-12-31").localeCompare(String(b.due_date || "9999-12-31")); }).slice(0, 8);
        var minDate;
        var maxDate;
        if (!target) return;
        if (!rows.length) {
            target.innerHTML = "<div class=\"detail-empty\">\uC77C\uC815 \uBC94\uC704\uB97C \uD45C\uC2DC\uD560 \uD0DC\uC2A4\uD06C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div>";
            return;
        }
        minDate = rows.reduce(function (acc, task) { var date = parseDate(task.start_date || task.due_date); return !acc || (date && date < acc) ? date : acc; }, null);
        maxDate = rows.reduce(function (acc, task) { var date = parseDate(task.due_date || task.start_date); return !acc || (date && date > acc) ? date : acc; }, null);
        target.innerHTML = rows.map(function (task) {
            var start = parseDate(task.start_date || task.due_date);
            var end = parseDate(task.due_date || task.start_date);
            var total = Math.max(1, Math.round((maxDate - minDate) / 86400000));
            var left = start ? Math.max(0, Math.round((((start - minDate) / 86400000) / total) * 100)) : 0;
            var width = end && start ? Math.max(8, Math.round((((end - start) / 86400000) / total) * 100)) : 12;
            return "<article class=\"dashboard-timeline-row\"><div class=\"dashboard-timeline-copy\"><strong>" + esc(task.task_title || "-") + "</strong><span>" + esc(formatPeriod(task.start_date, task.due_date)) + "</span></div><div class=\"dashboard-timeline-track\"><span class=\"dashboard-timeline-fill status-" + esc(String(task.task_status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")) + "\" style=\"left:" + esc(String(left)) + "%;width:" + esc(String(width)) + "%\"></span></div></article>";
        }).join("");
    }
    function bindTaskLinks(target) {
        if (!target) return;
        Array.prototype.forEach.call(target.querySelectorAll(".js-task-link"), function (button) {
            button.addEventListener("click", function () {
                moveToTask(button.getAttribute("data-project-id"), button.getAttribute("data-task-id"));
            });
        });
    }
    function renderRiskList() {
        var target = byId("riskList");
        var risky = state.tasks.filter(function (task) {
            var overdue = task.due_date && String(task.task_status || "") !== "DONE" && parseDate(task.due_date) < today();
            var stalled = String(task.task_status || "") === "HOLD";
            return overdue || stalled;
        }).slice(0, 6);
        if (!target) return;
        if (!risky.length) {
            target.innerHTML = "<div class=\"detail-empty\">\uC989\uC2DC \uD655\uC778\uC774 \uD544\uC694\uD55C \uC9C0\uC5F0 \uD0DC\uC2A4\uD06C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div>";
            return;
        }
        target.innerHTML = risky.map(function (task) {
            var overdue = task.due_date && String(task.task_status || "") !== "DONE" && parseDate(task.due_date) < today();
        return "<button type=\"button\" class=\"dashboard-watch-card is-risk js-task-link\" data-project-id=\"" + esc(task.project_id || "") + "\" data-task-id=\"" + esc(task.task_id || "") + "\"><strong>" + esc(task.task_title || "-") + "</strong><p>" + esc(task.project_name || "-") + "</p><div class=\"dashboard-watch-meta\"><span>" + esc(statusLabel(task.task_status)) + "</span><span>" + esc(overdue ? "\uC9C0\uC5F0 \uD0DC\uC2A4\uD06C" : "\uBCF4\uB958 \uD0DC\uC2A4\uD06C") + "</span></div></button>";
        }).join("");
        bindTaskLinks(target);
    }
    function renderTaskBoard() {
        var target = byId("taskBoard");
        var rows = state.tasks.slice().sort(function (a, b) { return String(a.due_date || "9999-12-31").localeCompare(String(b.due_date || "9999-12-31")); }).slice(0, 6);
        if (!target) return;
        if (!rows.length) {
            target.innerHTML = "<div class=\"detail-empty\">\uD45C\uC2DC\uD560 \uCD5C\uADFC \uD0DC\uC2A4\uD06C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div>";
            return;
        }
        target.innerHTML = rows.map(function (task) {
        return "<button type=\"button\" class=\"dashboard-watch-card js-task-link\" data-project-id=\"" + esc(task.project_id || "") + "\" data-task-id=\"" + esc(task.task_id || "") + "\"><div class=\"dashboard-watch-head\"><strong>" + esc(task.task_title || "-") + "</strong><span class=\"status-chip status-" + esc(String(task.task_status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")) + "\">" + esc(statusLabel(task.task_status)) + "</span></div><p>" + esc(task.assignee_user_id || "-") + " / " + esc(priorityLabel(task.priority)) + "</p><div class=\"dashboard-watch-meta\"><span>" + esc(formatPeriod(task.start_date, task.due_date)) + "</span><span>" + esc(formatPercent(task.progress_rate || 0)) + "</span></div></button>";
        }).join("");
        bindTaskLinks(target);
    }
    function renderDashboard() {
        renderProjectSelector();
        applyInsightCopy();
        renderProjectHero();
        renderMetricCards();
        renderNodeRollups();
        renderStatusChart();
        renderMonthlyTrendChart();
        renderTimelineChart();
        renderRiskList();
        renderTaskBoard();
    }
    function currentFilter() { return { project_type_code: byId("filterType").value }; }
    function applySelectedProject(projectId) {
        state.selectedProjectId = projectId ? String(projectId) : "";
        state.selectedProject = state.projects.find(function (project) { return String(project.project_id) === state.selectedProjectId; }) || null;
    }
    function loadProjectDetail() {
        if (!state.selectedProjectId) {
            state.projectDetail = null;
            state.tasks = [];
            renderDashboard();
            return Promise.resolve();
        }
        return Promise.all([
            UX.requestJson("/project/detail.json", { project_id: state.selectedProjectId }),
            UX.requestJson("/task/list.json", { project_id: state.selectedProjectId })
        ]).then(function (results) {
            var detail = results[0];
            var tasks = results[1];
            state.projectDetail = detail && detail.ok === true ? detail.data || null : null;
            state.tasks = tasks && tasks.ok === true && Array.isArray(tasks.data) ? tasks.data : [];
            return loadNodeRollups().then(renderDashboard);
        });
    }
    function loadNodeRollups() {
        if (!state.tasks.length) {
            state.nodeRollups = [];
            return Promise.resolve();
        }
        state.nodeRollups = buildTaskNodeRollupsFromTasks(state.tasks);
        return Promise.resolve();
    }
    function loadProjects(preserveSelection) {
        return UX.requestJson("/project/list.json", currentFilter()).then(function (response) {
            var nextId;
            state.projects = response && response.ok === true && Array.isArray(response.data) ? response.data : [];
            nextId = preserveSelection && state.projects.some(function (project) { return String(project.project_id) === String(state.selectedProjectId); }) ? state.selectedProjectId : (state.projects[0] ? String(state.projects[0].project_id) : "");
            applySelectedProject(nextId);
            return loadProjectDetail();
        });
    }
    function loadDashboard() {
        return Promise.all([
            UX.requestJson("/auth/me.json", {}),
            UX.requestJson("/dashboard/summary.json", currentFilter())
        ]).then(function (results) {
            var me = results[0];
            var summaryResponse = results[1];
            if (!me || me.ok !== true || !summaryResponse || summaryResponse.ok !== true) {
                redirectToLogin();
                return;
            }
            state.currentUser = me.data || {};
            state.summary = (summaryResponse.data && summaryResponse.data.summary) || {};
            bindInfo("currentUser", [
                { label: "\uC544\uC774\uB514", value: state.currentUser.user_id || "-" },
                { label: "\uC774\uB984", value: state.currentUser.user_nm || "-" },
                { label: "\uAD8C\uD55C", value: (state.currentUser.roles || []).join(", ") || "-" }
            ]);
            renderSummary(state.summary);
            return loadProjects(true);
        }).catch(function () { redirectToLogin(); });
    }
    function resetFilters() {
        byId("filterType").value = "";
        state.selectedProjectId = "";
        loadDashboard();
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
    function syncSidebarMode() { if (isMobileViewport()) { setSidebarOpen(false); return; } setSidebarOpen(true); }
    function bindEvents() {
        UX.bindOnce(byId("btnSearch"), "click", function () { loadProjects(false); });
        UX.bindOnce(byId("btnReset"), "click", resetFilters);
        UX.bindOnce(byId("btnReload"), "click", loadDashboard);
        UX.bindOnce(byId("btnLogout"), "click", logout);
        UX.bindOnce(byId("btnSidebarToggle"), "click", function () { setSidebarOpen(!state.sidebarOpen); });
        UX.bindOnce(byId("filterType"), "change", function () { state.selectedProjectId = ""; loadDashboard(); });
        UX.bindOnce(byId("filterProject"), "change", function () { applySelectedProject(byId("filterProject").value); loadProjectDetail(); });
        global.addEventListener("resize", function () {
            syncSidebarMode();
            if (state.monthlyChart) state.monthlyChart.resize();
        });
    }
    bindEvents();
    syncSidebarMode();
    renderDashboard();
    loadDashboard();
})(window);
