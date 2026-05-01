package com.realhogoo.jsschedule.api;

public enum ApiCode {
    OK("S0000", "success"),
    VALIDATION_ERROR("S4000", "\uc785\ub825\uac12\uc744 \ud655\uc778\ud574\uc8fc\uc138\uc694."),
    AUTH_REQUIRED("S4001", "\ub85c\uadf8\uc778\uc774 \ud544\uc694\ud569\ub2c8\ub2e4."),
    UNAUTHORIZED("S4002", "\ub85c\uadf8\uc778 \uc815\ubcf4\uac00 \uc720\ud6a8\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub85c\uadf8\uc778\ud574\uc8fc\uc138\uc694."),
    FORBIDDEN("S4003", "\uad8c\ud55c\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uad00\ub9ac\uc790\uc5d0\uac8c \uad8c\ud55c \uc124\uc815\uc744 \uc694\uccad\ud558\uc138\uc694."),
    NOT_FOUND("S4004", "\uc694\uccad\ud55c \ub300\uc0c1\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4."),
    METHOD_NOT_ALLOWED("S4005", "\ud5c8\uc6a9\ub418\uc9c0 \uc54a\uc740 \uc694\uccad \ubc29\uc2dd\uc785\ub2c8\ub2e4."),
    BIZ_ERROR("S4090", "\uc694\uccad\uc744 \ucc98\ub9ac\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4."),
    SERVER_ERROR("S5000", "\uc11c\ubc84 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4. \uad00\ub9ac\uc790\uc5d0\uac8c \ubb38\uc758\ud558\uc138\uc694.");

    private final String errorNo;
    private final String defaultMessage;

    ApiCode(String errorNo, String defaultMessage) {
        this.errorNo = errorNo;
        this.defaultMessage = defaultMessage;
    }

    public String errorNo() {
        return errorNo;
    }

    public String defaultMessage() {
        return defaultMessage;
    }
}
