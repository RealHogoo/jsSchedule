(function (global) {
    "use strict";

    var UX = global.UX;
    var countdownTimer = null;
    var retryUntilMs = 0;
    var MSG_READY = "다시 로그인할 수 있습니다.";
    var MSG_RETRY_SUFFIX = "초 후 다시 시도하세요.";
    var MSG_REQUIRED = "아이디와 비밀번호를 입력하세요.";
    var MSG_FAIL = "로그인에 실패했습니다.";
    var MSG_SUCCESS = "로그인되었습니다.";
    var MSG_SERVER_ERROR = "서버 오류가 발생했습니다. 잠시 후 다시 시도하세요.";

    function clearAuthStorage() {
        UX.localRemove(["JWT", "REFRESH_TOKEN", "LOGIN_USER", "LOGIN_SESSION_ID"]);
    }

    function setMsg(text, type) {
        var el = UX.byId("loginMsg");
        if (!el) return;
        el.textContent = text || "";
        el.className = "login-msg" + (type ? " is-" + type : "");
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
        return fetch("/login.json", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(body || {})
        }).then(function (response) {
            return response.json();
        });
    }

    function doLogin() {
        var userId = UX.normalizeText(UX.byId("login_user_id") && UX.byId("login_user_id").value);
        var userPw = (UX.byId("login_user_pw") && UX.byId("login_user_pw").value) || "";

        if (!userId || !userPw) {
            setMsg(MSG_REQUIRED, "error");
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
                        setMsg((res && res.message) ? res.message : MSG_FAIL, "error");
                    }
                    focusPassword();
                    return;
                }

                stopCountdown();
                UX.localSet("JWT", res.data && res.data.token ? res.data.token : "");
                UX.localSet("REFRESH_TOKEN", res.data && res.data.refresh_token ? res.data.refresh_token : "");
                UX.localSet("LOGIN_USER", JSON.stringify((res.data && res.data.user) ? res.data.user : {}));
                UX.localSet("LOGIN_SESSION_ID", res.data && res.data.session_id ? res.data.session_id : "");

                setMsg(MSG_SUCCESS, "success");
                global.location.href = "/schedule.html";
            })
            .catch(function () {
                clearAuthStorage();
                setDisabled(false);
                setMsg(MSG_SERVER_ERROR, "error");
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
        restoreCountdown();
    }

    init();
})(window);
