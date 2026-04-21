(function (global) {
    "use strict";

    var UX = global.UX;
    var countdownTimer = null;
    var retryUntilMs = 0;
    var MSG_READY = "\uB2E4\uC2DC \uB85C\uADF8\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
    var MSG_RETRY_SUFFIX = "\uCD08 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.";
    var MSG_REQUIRED = "\uC544\uC774\uB514\uC640 \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD558\uC138\uC694.";
    var MSG_FAIL = "\uB85C\uADF8\uC778\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.";
    var MSG_SUCCESS = "\uB85C\uADF8\uC778\uB418\uC5C8\uC2B5\uB2C8\uB2E4.";
    var MSG_SERVER_ERROR = "\uC11C\uBC84 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.";

    function clearAuthStorage() {
        UX.localRemove(["JWT", "REFRESH_TOKEN", "LOGIN_USER", "LOGIN_SESSION_ID"]);
    }

    function setMsg(text, type) {
        var el = UX.byId("loginMsg");
        if (!el) return;
        el.textContent = text || "";
        el.className = "login-msg" + (type ? " is-" + type : "");
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
        if (typeof target.select === "function") {
            target.select();
        }
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

    function setDisabled(disabled) {
        UX.setDisabled(UX.byId("btnLogin"), disabled);
        UX.setDisabled(UX.byId("login_user_id"), disabled);
        UX.setDisabled(UX.byId("login_user_pw"), disabled);
    }

    function stopCountdown() {
        if (countdownTimer) {
            global.clearInterval(countdownTimer);
            countdownTimer = null;
        }
        retryUntilMs = 0;
        UX.sessionRemove("LOGIN_RETRY_UNTIL_MS");
    }

    function startCountdown(untilMs) {
        stopCountdown();
        retryUntilMs = untilMs || 0;
        if (!retryUntilMs || retryUntilMs <= Date.now()) {
            setDisabled(false);
            return;
        }

        UX.sessionSet("LOGIN_RETRY_UNTIL_MS", String(retryUntilMs));
        setDisabled(true);

        function tick() {
            var remain = Math.max(0, Math.ceil((retryUntilMs - Date.now()) / 1000));
            if (remain <= 0) {
                stopCountdown();
                setDisabled(false);
                setMsg(MSG_READY, "info");
                return;
            }
            setMsg(remain + MSG_RETRY_SUFFIX, "warn");
        }

        tick();
        countdownTimer = global.setInterval(tick, 1000);
    }

    function restoreCountdown() {
        var untilMs = Number(UX.sessionGet("LOGIN_RETRY_UNTIL_MS", "0"));
        if (untilMs > Date.now()) startCountdown(untilMs);
        else stopCountdown();
    }

    function applyDelayInfo(data) {
        var retryAfterSeconds = data && Number(data.retry_after_seconds);
        var retryAvailableAt = data && Number(data.retry_available_at);
        if (retryAvailableAt > Date.now()) {
            startCountdown(retryAvailableAt);
            return true;
        }
        if (retryAfterSeconds > 0) {
            startCountdown(Date.now() + (retryAfterSeconds * 1000));
            return true;
        }
        return false;
    }

    function focusPassword() {
        var pw = UX.byId("login_user_pw");
        if (pw && !pw.disabled) {
            pw.focus();
            pw.select();
        }
    }

    function postLogin(body) {
        return UX.requestJson("/login.json", body || {}, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        });
    }

    function doLogin() {
        var userId = UX.normalizeText(UX.byId("login_user_id") && UX.byId("login_user_id").value);
        var userPw = (UX.byId("login_user_pw") && UX.byId("login_user_pw").value) || "";

        if (!userId || !userPw) {
            showWarningModal(MSG_REQUIRED, !userId ? "login_user_id" : "login_user_pw");
            return;
        }

        setDisabled(true);
        setMsg("", "");

        postLogin({ user_id: userId, user_pw: userPw })
            .then(function (res) {
                if (!res || res.ok !== true) {
                    clearAuthStorage();
                    if (!applyDelayInfo(res && res.data ? res.data : null)) {
                        setDisabled(false);
                        showWarningModal((res && res.message) ? res.message : MSG_FAIL, "login_user_pw");
                    }
                    focusPassword();
                    return;
                }

                stopCountdown();
                clearAuthStorage();

                setMsg(MSG_SUCCESS, "success");
                global.location.href = "/schedule.html";
            })
            .catch(function () {
                clearAuthStorage();
                setDisabled(false);
                showWarningModal(MSG_SERVER_ERROR);
            });
    }

    function init() {
        var btn = UX.byId("btnLogin");
        if (!btn || btn.getAttribute("data-bound") === "Y") return;
        btn.setAttribute("data-bound", "Y");
        btn.onclick = doLogin;

        function handleEnter(e) {
            if (e.key === "Enter" && !(btn && btn.disabled)) {
                doLogin();
            }
        }

        var userId = UX.byId("login_user_id");
        var pw = UX.byId("login_user_pw");
        if (userId) userId.onkeydown = handleEnter;
        if (pw) pw.onkeydown = handleEnter;
        if (userId) {
            userId.addEventListener("focus", clearFieldHighlight);
            userId.addEventListener("input", clearFieldHighlight);
        }
        if (pw) {
            pw.addEventListener("focus", clearFieldHighlight);
            pw.addEventListener("input", clearFieldHighlight);
        }
        restoreCountdown();
    }

    init();
})(window);
