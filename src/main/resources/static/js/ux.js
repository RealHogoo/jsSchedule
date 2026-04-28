(function (global) {
    "use strict";

    var UX = global.UX || {};
    global.UX = UX;

    function define(name, fn) {
        UX[name] = fn;
        if (typeof global[name] === "undefined") {
            global[name] = fn;
        }
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function qs(sel, root) {
        return (root || document).querySelector(sel);
    }

    function qsa(sel, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    }

    function normalizeText(value, fallback) {
        if (value === null || value === undefined) {
            return fallback || "";
        }
        var text = String(value).trim();
        return text ? text : (fallback || "");
    }

    function setDisabled(el, disabled) {
        if (!el) return;
        el.disabled = !!disabled;
    }

    function setText(selectorOrEl, value, root) {
        var el = typeof selectorOrEl === "string" ? qs(selectorOrEl, root) : selectorOrEl;
        if (el) el.textContent = value == null ? "" : String(value);
    }

    function esc(value) {
        if (value === null || value === undefined) return "";
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function bindOnce(el, evt, handler, key) {
        if (!el) return;
        var boundKey = key || ("bound_" + evt);
        if (el.dataset && el.dataset[boundKey] === "1") return;
        if (el.dataset) el.dataset[boundKey] = "1";
        el.addEventListener(evt, handler);
    }

    function localGet(key, fallback) {
        try {
            var value = localStorage.getItem(key);
            return value == null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function localSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {}
    }

    function localRemove(keys) {
        (Array.isArray(keys) ? keys : [keys]).forEach(function (key) {
            try { localStorage.removeItem(key); } catch (e) {}
        });
    }

    function sessionGet(key, fallback) {
        try {
            var value = sessionStorage.getItem(key);
            return value == null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function sessionSet(key, value) {
        try {
            sessionStorage.setItem(key, value);
        } catch (e) {}
    }

    function sessionRemove(keys) {
        (Array.isArray(keys) ? keys : [keys]).forEach(function (key) {
            try { sessionStorage.removeItem(key); } catch (e) {}
        });
    }

    function authHeaders() {
        return {
            "Content-Type": "application/json",
            "Accept": "application/json"
        };
    }

    function requestJson(url, body, options) {
        var opts = options || {};
        return fetch(url, {
            method: opts.method || "POST",
            credentials: opts.credentials || "same-origin",
            headers: opts.headers || authHeaders(),
            body: JSON.stringify(body || {})
        }).then(function (response) {
            return response.json();
        });
    }

    var releaseInfoPromise = null;

    function fetchReleaseInfo() {
        if (releaseInfoPromise) {
            return releaseInfoPromise;
        }

        releaseInfoPromise = fetch("/version.json", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: "{}"
        }).then(function (response) {
            return response.json();
        }).then(function (payload) {
            var data = payload && payload.ok === true ? (payload.data || {}) : {};
            return {
                service: normalizeText(data.service, "schedule-service"),
                revision: normalizeText(data.revision, "unknown")
            };
        }).catch(function () {
            return {
                service: "schedule-service",
                revision: "unknown"
            };
        });

        return releaseInfoPromise;
    }

    function renderScheduleReleaseInfo() {
        var currentUser = byId("currentUser");
        var userSection;
        var sidebarBody;
        var section;
        var label;
        var value;

        if (!currentUser || byId("releaseInfoSection")) {
            return;
        }

        userSection = currentUser.closest ? currentUser.closest(".sidebar-section") : currentUser.parentNode;
        sidebarBody = userSection ? userSection.parentNode : null;
        if (!userSection || !sidebarBody) {
            return;
        }

        section = document.createElement("section");
        section.id = "releaseInfoSection";
        section.className = "sidebar-section sidebar-section-release";
        section.innerHTML = ""
            + "<div class=\"section-label\">Release</div>"
            + "<div class=\"release-badge\" id=\"releaseBadge\">"
            + "<span class=\"release-badge-label\" id=\"releaseBadgeLabel\">recent push</span>"
            + "<strong class=\"release-badge-value\" id=\"releaseBadgeValue\">loading</strong>"
            + "</div>";

        sidebarBody.insertBefore(section, userSection);
        label = byId("releaseBadgeLabel");
        value = byId("releaseBadgeValue");

        fetchReleaseInfo().then(function (info) {
            setText(label, info.service);
            setText(value, info.revision);
        });
    }

    function ensureAlertModal() {
        var existing = byId("uxAlertModal");
        if (existing) return existing;

        var modal = document.createElement("div");
        modal.id = "uxAlertModal";
        modal.className = "modal-backdrop alert-modal-backdrop";
        modal.hidden = true;
        modal.innerHTML = ""
            + "<div class=\"modal-panel alert-modal-panel\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"uxAlertTitle\">"
            + "<div class=\"detail-head\">"
            + "<div>"
            + "<div id=\"uxAlertTitle\" class=\"panel-title\">안내</div>"
            + "<p id=\"uxAlertMessage\" class=\"alert-modal-message\"></p>"
            + "</div>"
            + "<button type=\"button\" id=\"uxAlertClose\" class=\"btn btn-primary\">닫기</button>"
            + "</div>"
            + "</div>";

        document.body.appendChild(modal);
        bindOnce(byId("uxAlertClose"), "click", function () {
            hideAlertModal();
        });
        bindOnce(modal, "click", function (event) {
            if (event.target === modal) {
                hideAlertModal();
            }
        });
        return modal;
    }

    function showAlertModal(options) {
        var modal = ensureAlertModal();
        var config = options || {};
        modal._onClose = typeof config.onClose === "function" ? config.onClose : null;
        setText(byId("uxAlertTitle"), normalizeText(config.title, "안내"));
        setText(byId("uxAlertMessage"), normalizeText(config.message, ""));
        modal.hidden = false;
        byId("uxAlertClose").focus();
    }

    function hideAlertModal() {
        var modal = byId("uxAlertModal");
        var onClose;
        if (!modal) return;
        onClose = modal._onClose;
        modal._onClose = null;
        modal.hidden = true;
        if (typeof onClose === "function") {
            onClose();
        }
    }

    function normalizeHelpTitle(value) {
        var text = normalizeText(value, "");
        if (!text) return "참고";
        if (text === "Workspace note") return "참고";
        return text;
    }

    function createHelpDetails(sections) {
        var details = document.createElement("details");
        var summary = document.createElement("summary");
        var toggle = document.createElement("span");
        var body = document.createElement("div");

        details.className = "page-help page-help-static";
        toggle.className = "page-help-toggle";
        toggle.textContent = "?";
        summary.appendChild(toggle);

        body.className = "page-help-body";
        sections.forEach(function (section) {
            var wrap = document.createElement("div");
            var title = document.createElement("strong");
            var text = document.createElement("p");
            wrap.className = "page-help-section";
            title.textContent = section.title;
            text.textContent = section.text;
            wrap.appendChild(title);
            wrap.appendChild(text);
            body.appendChild(wrap);
        });

        details.appendChild(summary);
        details.appendChild(body);
        return details;
    }

    function mountSchedulePageHelp() {
        var hero = qs(".workspace-hero");
        var inlineHead = qs(".inline-workspace-head");
        var descEl = qs(".workspace-desc");
        var copyEl = qs(".workspace-copy");
        var noteEl = qs(".sidebar-note");
        var subtitleEl = byId("taskWorkspaceSubtitle");
        var sections = [];
        var actionsHost;
        var heroStat;
        var heroSide;

        if (qs(".workspace-help-actions .page-help") || qs(".workspace-hero-side .page-help")) {
            return;
        }

        if (descEl) {
            sections.push({ title: "화면 설명", text: normalizeText(descEl.textContent, "") });
            descEl.remove();
        }
        if (copyEl) {
            sections.push({ title: "기능 설명", text: normalizeText(copyEl.textContent, "") });
            copyEl.remove();
        }
        if (subtitleEl) {
            sections.push({ title: "기능 설명", text: normalizeText(subtitleEl.textContent, "") });
            subtitleEl.remove();
        }
        if (noteEl) {
            sections.push({
                title: normalizeHelpTitle(qs("strong", noteEl) ? qs("strong", noteEl).textContent : ""),
                text: normalizeText(qs("p", noteEl) ? qs("p", noteEl).textContent : "", "")
            });
            noteEl.remove();
        }

        sections = sections.filter(function (section) {
            return section.text;
        });
        if (!sections.length) return;

        if (hero) {
            hero.classList.add("workspace-hero-with-help");
            actionsHost = qs(".calendar-hero-actions", hero);
            if (actionsHost) {
                actionsHost.classList.add("workspace-help-actions");
                actionsHost.insertBefore(createHelpDetails(sections), actionsHost.firstChild);
                return;
            }
            heroStat = qs(".hero-stat", hero);
            if (heroStat) {
                heroSide = document.createElement("div");
                heroSide.className = "workspace-hero-side";
                hero.insertBefore(heroSide, heroStat);
                heroSide.appendChild(createHelpDetails(sections));
                heroSide.appendChild(heroStat);
                return;
            }
            actionsHost = document.createElement("div");
            actionsHost.className = "workspace-help-actions";
            actionsHost.appendChild(createHelpDetails(sections));
            hero.appendChild(actionsHost);
            return;
        }

        if (inlineHead) {
            actionsHost = qs(".btns", inlineHead);
            if (!actionsHost) {
                actionsHost = document.createElement("div");
                actionsHost.className = "btns";
                inlineHead.appendChild(actionsHost);
            }
            actionsHost.classList.add("workspace-help-actions");
            actionsHost.insertBefore(createHelpDetails(sections), actionsHost.firstChild);
        }
    }

    function cleanupScheduleGuidance() {
        qsa(".workspace-desc, .workspace-copy, .sidebar-note, .compact-head-note").forEach(function (el) {
            el.remove();
        });

        qsa(".table-copy").forEach(function (el) {
            if (el.id === "selectedDateTitle") return;
            el.remove();
        });

        qsa(".calendar-day-selector > .panel-title, .day-task-panel .panel-title").forEach(function (el) {
            el.remove();
        });
    }

    define("byId", byId);
    define("qs", qs);
    define("qsa", qsa);
    define("normalizeText", normalizeText);
    define("setDisabled", setDisabled);
    define("setText", setText);
    define("esc", esc);
    define("bindOnce", bindOnce);
    define("localGet", localGet);
    define("localSet", localSet);
    define("localRemove", localRemove);
    define("sessionGet", sessionGet);
    define("sessionSet", sessionSet);
    define("sessionRemove", sessionRemove);
    define("authHeaders", authHeaders);
    define("requestJson", requestJson);
    define("fetchReleaseInfo", fetchReleaseInfo);
    define("renderScheduleReleaseInfo", renderScheduleReleaseInfo);
    define("showAlertModal", showAlertModal);
    define("hideAlertModal", hideAlertModal);
    define("mountSchedulePageHelp", mountSchedulePageHelp);
    define("cleanupScheduleGuidance", cleanupScheduleGuidance);

    if (document.body && document.body.classList.contains("schedule-page")) {
        renderScheduleReleaseInfo();
        mountSchedulePageHelp();
        cleanupScheduleGuidance();
    }
})(window);
