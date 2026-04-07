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
        selectedTaskDetail: null,
        taskMode: "list",
        nodeTree: [],
        selectedNodeId: "",
        nodeMetrics: []
    };

    function byId(id) { return UX.byId(id); }
    function queryParam(name) { return new URLSearchParams(global.location.search).get(name); }
    function redirectToLogin() { global.location.href = "/"; }
    function goToProjects() { global.location.href = "/schedule.html"; }
    function esc(value) { return UX.esc(value == null ? "" : String(value)); }

    function setMessage(targetId, text, type) {
        var target = byId(targetId);
        if (!target) return;
        target.textContent = text || "";
        target.className = "form-msg" + (type ? " is-" + type : "");
    }

    function setTaskMessage(text, type) { setMessage("taskActionMsg", text, type); }
    function setTaskFormMessage(text, type) { setMessage("taskFormMsg", text, type); }
    function setNodeMessage(text, type) {
        setMessage("nodeActionMsg", text, type);
        setMessage("nodeFormMsg", text, type);
    }

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

    function userLabel(userNm, userId) {
        if (!userNm && !userId) return "";
        if (!userNm) return userId;
        if (!userId) return userNm;
        return userNm + "(" + userId + ")";
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
            "<span>상태 " + esc(state.project.project_status || "-") + "</span>",
            "<span>PM " + esc(state.project.owner_user_id || "-") + "</span>",
            "<span>기간 " + esc(formatPeriod(state.project.start_date, state.project.end_date)) + "</span>",
            "<span>태스크 " + esc(String(state.project.task_count || 0)) + "</span>"
        ].join("");
    }

    function setTaskMode(mode, task) {
        state.taskMode = mode;
        byId("taskListSection").hidden = mode !== "list";
        byId("taskFormSection").hidden = mode !== "form";
        byId("btnBackToTaskListInline").hidden = mode !== "form";
        UX.setText(byId("taskWorkspaceTitle"), mode === "form" ? (task && task.task_id ? "태스크 수정" : "태스크 등록") : "프로젝트 태스크 목록");
        UX.setText(byId("taskWorkspaceSubtitle"), mode === "form" ? "선택한 프로젝트 안에서 바로 저장합니다." : "태스크를 선택하면 아래 노드 작업영역이 열립니다.");
    }

    function renderTaskTable() {
        var target = byId("taskRows");
        if (!target) return;

        if (!state.tasks.length) {
            target.innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">등록된 태스크가 없습니다.</td></tr>";
            return;
        }

        target.innerHTML = state.tasks.map(function (task) {
            var taskId = String(task.task_id || "");
            var selected = taskId === String(state.selectedTaskId);
            return "<tr class=\"" + (selected ? "is-selected" : "") + "\" data-task-id=\"" + esc(taskId) + "\">"
                + "<td><div class=\"row-link\"><span class=\"row-title\">" + esc(task.task_title || "-") + "</span><span class=\"row-sub\">" + esc(task.milestone_name || "-") + "</span></div></td>"
                + "<td><span class=\"status-chip status-" + esc(String(task.task_status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")) + "\">" + esc(task.task_status || "-") + "</span></td>"
                + "<td><span class=\"status-chip priority-" + esc(String(task.priority || "").toLowerCase()) + "\">" + esc(task.priority || "-") + "</span></td>"
                + "<td>" + esc(task.assignee_user_id || "-") + "</td>"
                + "<td>" + esc(formatPeriod(task.start_date, task.due_date)) + "</td>"
                + "<td><div class=\"btns\"><span>" + esc(formatProgress(task.progress_rate)) + "</span><button type=\"button\" class=\"node-mini-btn task-edit-action\" data-task-id=\"" + esc(taskId) + "\">편집</button></div></td>"
                + "</tr>";
        }).join("");

        UX.qsa("#taskRows tr[data-task-id]").forEach(function (row) {
            UX.bindOnce(row, "click", function (event) {
                if (event.target && event.target.classList.contains("task-edit-action")) return;
                openTaskNodes(row.getAttribute("data-task-id"));
            });
        });

        UX.qsa(".task-edit-action", target).forEach(function (button) {
            UX.bindOnce(button, "click", function (event) {
                event.stopPropagation();
                openTaskEditor(button.getAttribute("data-task-id"));
            });
        });
    }

    function renderTaskForm(task) {
        setTaskMode("form", task);
        byId("taskId").value = task && task.task_id ? String(task.task_id) : "";
        byId("taskTitle").value = task && task.task_title ? String(task.task_title) : "";
        byId("taskStatus").value = task && task.task_status ? String(task.task_status) : "TODO";
        byId("taskPriority").value = task && task.priority ? String(task.priority) : "MEDIUM";
        byId("taskAssigneeUserId").value = task && task.assignee_user_id ? String(task.assignee_user_id) : "";
        byId("taskAssigneeDisplay").value = userLabel(task && task.assignee_user_nm ? String(task.assignee_user_nm) : "", task && task.assignee_user_id ? String(task.assignee_user_id) : "");
        byId("taskStartDate").value = task && task.start_date ? String(task.start_date).slice(0, 10) : "";
        byId("taskDueDate").value = task && task.due_date ? String(task.due_date).slice(0, 10) : "";
        byId("taskProgressRate").value = task && task.progress_rate != null ? String(Math.round(Number(task.progress_rate || 0))) : "0";
        byId("taskDescription").value = task && task.description ? String(task.description) : "";
        byId("taskMeta").innerHTML = task && task.task_id
            ? "<span>태스크 ID " + esc(task.task_id) + "</span><span>프로젝트 " + esc(state.project && state.project.project_name || "-") + "</span>"
            : "<span>선택한 프로젝트에 새 태스크를 등록합니다.</span>";
        setTaskFormMessage("", "");
    }

    function backToTaskList() {
        setTaskMode("list");
        setTaskFormMessage("", "");
    }

    function createTaskPayload() {
        return {
            task_id: byId("taskId").value.trim() || null,
            project_id: state.projectId,
            task_title: byId("taskTitle").value.trim(),
            task_status: byId("taskStatus").value,
            priority: byId("taskPriority").value,
            assignee_user_id: byId("taskAssigneeUserId").value.trim(),
            start_date: byId("taskStartDate").value || null,
            due_date: byId("taskDueDate").value || null,
            progress_rate: byId("taskProgressRate").value || 0,
            description: byId("taskDescription").value.trim()
        };
    }

    function saveTask() {
        if (!state.projectId) {
            setTaskFormMessage("프로젝트 정보가 없습니다.", "error");
            return;
        }

        UX.requestJson("/task/save.json", createTaskPayload()).then(function (response) {
            if (!response || response.ok !== true) {
                setTaskFormMessage(apiMessage(response, "태스크 저장에 실패했습니다."), "error");
                return;
            }
            setTaskMessage("태스크가 저장되었습니다.", "success");
            backToTaskList();
            loadTasks();
        }).catch(function () {
            setTaskFormMessage("태스크 저장에 실패했습니다.", "error");
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

    function flattenNodes(nodes, bucket) {
        (nodes || []).forEach(function (node) {
            bucket.push(node);
            flattenNodes(node.children || [], bucket);
        });
        return bucket;
    }

    function findNode(nodeId) {
        return flattenNodes(state.nodeTree, []).filter(function (node) {
            return String(node.node_id) === String(nodeId);
        })[0] || null;
    }

    function countNodes(nodes) {
        var count = 0;
        (nodes || []).forEach(function (node) {
            count += 1 + countNodes(node.children || []);
        });
        return count;
    }

    function resetNodeWorkspace() {
        state.nodeTree = [];
        state.selectedNodeId = "";
        state.nodeMetrics = [];
        byId("nodeWorkspaceEmpty").hidden = false;
        byId("nodeWorkspaceBody").hidden = true;
        UX.setText(byId("selectedTaskName"), "선택된 태스크 없음");
        UX.setText(byId("nodeTreeMeta"), "0개 노드");
        byId("nodeTree").innerHTML = "";
        byId("nodeMetricRows").innerHTML = "";
        byId("nodeMeta").innerHTML = "";
        byId("nodeId").value = "";
        byId("nodeTaskId").value = "";
        byId("nodeTaskName").value = "";
        byId("nodeParentName").value = "";
        byId("nodeName").value = "";
        byId("nodeType").value = "DEFAULT";
        byId("nodeInsertMode").value = "CHILD";
        byId("nodeUseYn").value = "Y";
        byId("nodeDescription").value = "";
        byId("btnNewRootNode").disabled = true;
        byId("btnNewChildNode").disabled = true;
        byId("btnNewSiblingNode").disabled = true;
        byId("btnDeleteNode").disabled = true;
        setNodeMessage("", "");
    }

    function syncNodeButtons() {
        var hasTask = !!state.selectedTaskId;
        var hasNode = !!state.selectedNodeId;
        byId("btnNewRootNode").disabled = !hasTask;
        byId("btnNewChildNode").disabled = !hasTask;
        byId("btnNewSiblingNode").disabled = !hasNode;
        byId("btnDeleteNode").disabled = !hasNode;
    }

    function renderNodeMetrics(values) {
        var target = byId("nodeMetricRows");
        var valueMap = {};
        (values || []).forEach(function (item) {
            valueMap[String(item.metric_def_id)] = item;
        });

        if (!state.nodeMetrics.length) {
            target.innerHTML = "<div class=\"detail-empty\">연결된 통계 항목이 없습니다.</div>";
            return;
        }

        target.innerHTML = state.nodeMetrics.map(function (metric) {
            var value = valueMap[String(metric.metric_def_id)] || {};
            return "<section class=\"node-metric-row\">"
                + "<div class=\"node-panel-head\"><strong>" + esc(metric.metric_name || "-") + "</strong><span class=\"node-panel-meta\">통계 " + esc(metric.include_in_stats_yn || "Y") + "</span></div>"
                + "<div class=\"node-metric-grid\">"
                + "<input class=\"input node-metric-input\" data-metric-id=\"" + esc(String(metric.metric_def_id)) + "\" data-slot=\"1\" type=\"text\" placeholder=\"값 1\" value=\"" + esc(value.value_1 || "") + "\">"
                + "<input class=\"input node-metric-input\" data-metric-id=\"" + esc(String(metric.metric_def_id)) + "\" data-slot=\"2\" type=\"text\" placeholder=\"값 2\" value=\"" + esc(value.value_2 || "") + "\">"
                + "<input class=\"input node-metric-input\" data-metric-id=\"" + esc(String(metric.metric_def_id)) + "\" data-slot=\"3\" type=\"text\" placeholder=\"값 3\" value=\"" + esc(value.value_3 || "") + "\">"
                + "</div></section>";
        }).join("");
    }

    function renderNodeTree() {
        var target = byId("nodeTree");
        if (!state.nodeTree.length) {
            target.innerHTML = "<div class=\"detail-empty\">등록된 노드가 없습니다. 루트 노드를 추가하세요.</div>";
            return;
        }

        target.innerHTML = flattenNodes(state.nodeTree, []).map(function (node) {
            var selected = String(node.node_id) === String(state.selectedNodeId);
            return "<button type=\"button\" class=\"node-tree-item" + (selected ? " is-selected" : "") + "\" data-node-id=\"" + esc(String(node.node_id)) + "\" style=\"margin-left:" + (Number(node.depth || 0) * 18) + "px\">"
                + "<span class=\"node-tree-main\"><span class=\"node-tree-title\">" + esc(node.node_name || "-") + "</span><span class=\"node-tree-sub\">" + esc(node.node_type || "-") + " · 하위 " + esc(String(node.child_count || 0)) + "개</span></span>"
                + "<span class=\"node-tree-actions\"><span class=\"status-chip\">" + esc(node.use_yn || "Y") + "</span><span class=\"node-mini-btn\" data-node-action=\"child\">하위</span><span class=\"node-mini-btn\" data-node-action=\"sibling\">형제</span></span>"
                + "</button>";
        }).join("");

        UX.qsa(".node-tree-item", target).forEach(function (button) {
            UX.bindOnce(button, "click", function (event) {
                var action = event.target && event.target.getAttribute("data-node-action");
                var nodeId = button.getAttribute("data-node-id");
                if (action === "child") {
                    openNewNode("CHILD", nodeId);
                    return;
                }
                if (action === "sibling") {
                    openNewNode("SIBLING", nodeId);
                    return;
                }
                loadNodeDetail(nodeId);
            });
        });
    }

    function renderNodeWorkspace() {
        if (!state.selectedTaskDetail) {
            resetNodeWorkspace();
            return;
        }

        byId("nodeWorkspaceEmpty").hidden = true;
        byId("nodeWorkspaceBody").hidden = false;
        UX.setText(byId("selectedTaskName"), state.selectedTaskDetail.task_title || "-");
        UX.setText(byId("nodeTreeMeta"), String(countNodes(state.nodeTree)) + "개 노드");
        byId("nodeTaskId").value = state.selectedTaskId || "";
        byId("nodeTaskName").value = state.selectedTaskDetail.task_title || "";
        renderNodeTree();
        renderNodeMetrics([]);
        syncNodeButtons();
    }

    function renderNodeForm(node, isEdit, insertMode) {
        state.selectedNodeId = isEdit && node && node.node_id ? String(node.node_id) : (state.selectedNodeId || "");
        byId("nodeId").value = isEdit && node ? String(node.node_id) : "";
        byId("nodeTaskId").value = state.selectedTaskId || "";
        byId("nodeTaskName").value = state.selectedTaskDetail ? String(state.selectedTaskDetail.task_title || "") : "";
        byId("nodeParentName").value = node && node.parent_node_id && findNode(node.parent_node_id) ? String(findNode(node.parent_node_id).node_name || "") : "루트";
        byId("nodeName").value = node && node.node_name ? String(node.node_name) : "";
        byId("nodeType").value = node && node.node_type ? String(node.node_type) : "DEFAULT";
        byId("nodeInsertMode").value = insertMode || "CHILD";
        byId("nodeUseYn").value = node && node.use_yn ? String(node.use_yn) : "Y";
        byId("nodeDescription").value = node && node.description ? String(node.description) : "";
        UX.setText(byId("nodeFormTitle"), isEdit ? "노드 수정" : "노드 등록");
        UX.setText(byId("nodeFormMode"), isEdit ? "선택 노드 기준" : "신규 추가");
        byId("nodeMeta").innerHTML = isEdit && node
            ? "<span>노드 ID " + esc(node.node_id) + "</span><span>깊이 " + esc(node.depth || 0) + "</span><span>유형 " + esc(node.node_type || "-") + "</span>"
            : "<span>선택한 태스크 아래 새 노드를 추가합니다.</span>";
        renderNodeMetrics(node && node.metrics ? node.metrics : []);
        renderNodeTree();
        syncNodeButtons();
        setNodeMessage("", "");
    }

    function metricValue(metricId, slot) {
        var input = UX.qs(".node-metric-input[data-metric-id=\"" + metricId + "\"][data-slot=\"" + slot + "\"]");
        return input ? input.value.trim() : "";
    }

    function createNodePayload() {
        var insertMode = byId("nodeInsertMode").value;
        var baseNode = state.selectedNodeId ? findNode(state.selectedNodeId) : null;
        var parentNodeId = null;
        if (byId("nodeId").value) {
            var current = findNode(byId("nodeId").value);
            parentNodeId = current ? current.parent_node_id : null;
        } else if (insertMode === "CHILD") {
            parentNodeId = state.selectedNodeId || null;
        } else if (insertMode === "SIBLING") {
            parentNodeId = baseNode ? baseNode.parent_node_id : null;
        }

        return {
            node_id: byId("nodeId").value.trim() || null,
            task_id: state.selectedTaskId || null,
            parent_node_id: insertMode === "ROOT" ? null : parentNodeId,
            insert_mode: insertMode,
            node_name: byId("nodeName").value.trim(),
            node_type: byId("nodeType").value.trim() || "DEFAULT",
            description: byId("nodeDescription").value.trim(),
            use_yn: byId("nodeUseYn").value,
            metrics: state.nodeMetrics.map(function (metric) {
                return {
                    metric_def_id: metric.metric_def_id,
                    value_1: metricValue(metric.metric_def_id, 1),
                    value_2: metricValue(metric.metric_def_id, 2),
                    value_3: metricValue(metric.metric_def_id, 3)
                };
            })
        };
    }

    function reloadNodes(focusNodeId) {
        if (!state.selectedTaskId) return Promise.resolve();
        return Promise.all([
            UX.requestJson("/node/tree.json", { task_id: state.selectedTaskId }),
            UX.requestJson("/task-type/metric/list.json", { task_type_code: state.selectedTaskDetail && state.selectedTaskDetail.task_type_code ? state.selectedTaskDetail.task_type_code : "GENERAL" })
        ]).then(function (results) {
            var treeResponse = results[0];
            var metricResponse = results[1];
            if (!treeResponse || treeResponse.ok !== true) {
                setNodeMessage(apiMessage(treeResponse, "노드 트리를 불러오지 못했습니다."), "error");
                return;
            }
            state.nodeTree = Array.isArray(treeResponse.data && treeResponse.data.nodes) ? treeResponse.data.nodes : [];
            state.nodeMetrics = metricResponse && metricResponse.ok === true && Array.isArray(metricResponse.data) ? metricResponse.data : [];
            renderNodeWorkspace();
            if (focusNodeId) loadNodeDetail(focusNodeId);
        });
    }

    function loadNodeDetail(nodeId) {
        UX.requestJson("/node/detail.json", { node_id: nodeId }).then(function (response) {
            if (!response || response.ok !== true) {
                setNodeMessage(apiMessage(response, "노드 상세를 불러오지 못했습니다."), "error");
                return;
            }
            renderNodeForm(response.data || null, true);
        }).catch(function () {
            setNodeMessage("노드 상세를 불러오지 못했습니다.", "error");
        });
    }

    function openNewNode(insertMode, baseNodeId) {
        if (!state.selectedTaskDetail) {
            setNodeMessage("태스크를 먼저 선택하세요.", "error");
            return;
        }
        var baseNode = baseNodeId ? findNode(baseNodeId) : null;
        state.selectedNodeId = baseNodeId ? String(baseNodeId) : "";
        renderNodeForm({
            parent_node_id: insertMode === "ROOT" ? null : (insertMode === "CHILD" ? baseNodeId : (baseNode ? baseNode.parent_node_id : null)),
            node_type: baseNode && baseNode.node_type ? baseNode.node_type : "DEFAULT",
            use_yn: "Y"
        }, false, insertMode);
    }

    function saveNode() {
        if (!state.selectedTaskId) {
            setNodeMessage("태스크를 먼저 선택하세요.", "error");
            return;
        }
        if (!byId("nodeName").value.trim()) {
            setNodeMessage("노드명을 입력하세요.", "error");
            return;
        }

        UX.requestJson("/node/save.json", createNodePayload()).then(function (response) {
            if (!response || response.ok !== true) {
                setNodeMessage(apiMessage(response, "노드를 저장하지 못했습니다."), "error");
                return;
            }
            setNodeMessage("노드가 저장되었습니다.", "success");
            reloadNodes(response.data && response.data.node_id);
        }).catch(function () {
            setNodeMessage("노드를 저장하지 못했습니다.", "error");
        });
    }

    function deleteNode() {
        if (!state.selectedNodeId) {
            setNodeMessage("삭제할 노드를 먼저 선택하세요.", "error");
            return;
        }

        UX.requestJson("/node/delete.json", { node_id: state.selectedNodeId }).then(function (response) {
            if (!response || response.ok !== true) {
                setNodeMessage(apiMessage(response, "노드를 삭제하지 못했습니다."), "error");
                return;
            }
            state.selectedNodeId = "";
            setNodeMessage("노드가 삭제되었습니다.", "success");
            reloadNodes();
        }).catch(function () {
            setNodeMessage("노드를 삭제하지 못했습니다.", "error");
        });
    }

    function openTaskNodes(taskId) {
        state.selectedTaskId = String(taskId);
        renderTaskTable();
        UX.requestJson("/task/detail.json", { task_id: taskId }).then(function (response) {
            if (!response || response.ok !== true) {
                setNodeMessage(apiMessage(response, "태스크 상세를 불러오지 못했습니다."), "error");
                return;
            }
            state.selectedTaskDetail = response.data || {};
            reloadNodes().then(function () {
                openNewNode("ROOT");
            });
        }).catch(function () {
            setNodeMessage("노드 작업영역을 불러오지 못했습니다.", "error");
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
        }).catch(function () {
            state.tasks = [];
            byId("taskRows").innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">태스크를 불러오지 못했습니다.</td></tr>";
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
        UX.bindOnce(byId("assigneeKeyword"), "keydown", function (event) {
            if (event.key === "Enter") loadAssigneeOptions();
        });
        UX.bindOnce(byId("btnSidebarToggle"), "click", function () {
            setSidebarOpen(!state.sidebarOpen);
        });
        UX.bindOnce(byId("btnNewRootNode"), "click", function () { openNewNode("ROOT"); });
        UX.bindOnce(byId("btnNewChildNode"), "click", function () { openNewNode("CHILD", state.selectedNodeId); });
        UX.bindOnce(byId("btnNewSiblingNode"), "click", function () { openNewNode("SIBLING", state.selectedNodeId); });
        UX.bindOnce(byId("btnResetNodeForm"), "click", function () {
            if (state.selectedNodeId) {
                loadNodeDetail(state.selectedNodeId);
                return;
            }
            openNewNode("ROOT");
        });
        UX.bindOnce(byId("btnSaveNode"), "click", saveNode);
        UX.bindOnce(byId("btnDeleteNode"), "click", deleteNode);
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
    resetNodeWorkspace();

    if (!state.projectId) {
        byId("selectedProjectName").textContent = "프로젝트를 먼저 선택하세요.";
        byId("projectSummary").innerHTML = "<span>이 화면은 프로젝트 선택 후 태스크 작업용입니다.</span>";
        byId("taskRows").innerHTML = "<tr><td colspan=\"6\" class=\"empty-row\">프로젝트 목록에서 프로젝트를 선택하면 태스크가 표시됩니다.</td></tr>";
        byId("btnOpenProject").disabled = true;
        byId("btnNewTask").disabled = true;
        loadContext();
        return;
    }

    loadContext().then(loadProject).then(loadTasks);
})(window);
