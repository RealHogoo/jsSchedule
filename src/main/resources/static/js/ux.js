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
        var headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        };
        var token = localGet("JWT", "");
        if (token) {
            headers.Authorization = "Bearer " + token;
        }
        return headers;
    }

    function requestJson(url, body, options) {
        var opts = options || {};
        return fetch(url, {
            method: opts.method || "POST",
            headers: opts.headers || authHeaders(),
            body: JSON.stringify(body || {})
        }).then(function (response) {
            return response.json();
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
    define("showAlertModal", showAlertModal);
    define("hideAlertModal", hideAlertModal);
})(window);
