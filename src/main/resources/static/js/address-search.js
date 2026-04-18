(function (global) {
    "use strict";

    var UX = global.UX;
    var state = {
        initialized: false,
        loading: false,
        config: null,
        currentPage: 1,
        keyword: "",
        onSelect: null
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function ensureModal() {
        if (state.initialized) {
            return;
        }
        state.initialized = true;
        document.body.insertAdjacentHTML("beforeend", [
            "<div id=\"addressSearchModal\" class=\"modal-backdrop\" hidden>",
            "  <div class=\"modal-panel address-search-modal-panel\">",
            "    <div class=\"detail-head\">",
            "      <div>",
            "        <div id=\"addressSearchTitle\" class=\"panel-title\">주소 검색</div>",
            "        <p class=\"table-copy\">카카오 지도 검색 결과에서 선택한 주소를 입력값에 반영합니다.</p>",
            "      </div>",
            "      <button type=\"button\" id=\"btnCloseAddressSearchModal\" class=\"btn\">닫기</button>",
            "    </div>",
            "    <div class=\"picker-search\">",
            "      <input id=\"addressSearchKeyword\" class=\"input\" type=\"text\" placeholder=\"예: 대구광역시 동구 반야월북로 355\">",
            "      <button type=\"button\" id=\"btnAddressSearch\" class=\"btn btn-primary\">검색</button>",
            "    </div>",
            "    <div id=\"addressSearchMessage\" class=\"form-msg\" aria-live=\"polite\"></div>",
            "    <div id=\"addressSearchResults\" class=\"address-search-results\"></div>",
            "    <div class=\"address-search-pagination\">",
            "      <button type=\"button\" id=\"btnAddressPrevPage\" class=\"btn\">이전</button>",
            "      <strong id=\"addressSearchPageLabel\">1</strong>",
            "      <button type=\"button\" id=\"btnAddressNextPage\" class=\"btn\">다음</button>",
            "    </div>",
            "  </div>",
            "</div>"
        ].join(""));

        UX.bindOnce(byId("btnCloseAddressSearchModal"), "click", close);
        UX.bindOnce(byId("btnAddressSearch"), "click", function () {
            state.currentPage = 1;
            state.keyword = byId("addressSearchKeyword").value.trim();
            search();
        });
        UX.bindOnce(byId("btnAddressPrevPage"), "click", function () {
            if (state.currentPage <= 1 || state.loading) {
                return;
            }
            state.currentPage -= 1;
            search();
        });
        UX.bindOnce(byId("btnAddressNextPage"), "click", function () {
            if (state.loading) {
                return;
            }
            state.currentPage += 1;
            search();
        });
        UX.bindOnce(byId("addressSearchKeyword"), "keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                state.currentPage = 1;
                state.keyword = byId("addressSearchKeyword").value.trim();
                search();
            }
        });
        UX.bindOnce(byId("addressSearchModal"), "click", function (event) {
            if (event.target && event.target.id === "addressSearchModal") {
                close();
            }
        });
    }

    function setMessage(text, type) {
        var target = byId("addressSearchMessage");
        if (!target) {
            return;
        }
        target.textContent = text || "";
        target.className = "form-msg" + (type ? " is-" + type : "");
    }

    function setLoading(loading) {
        state.loading = !!loading;
        UX.setDisabled(byId("btnAddressSearch"), state.loading);
        UX.setDisabled(byId("btnAddressPrevPage"), state.loading || state.currentPage <= 1);
        UX.setDisabled(byId("btnAddressNextPage"), state.loading);
    }

    function renderResults(data) {
        var target = byId("addressSearchResults");
        var items = data && Array.isArray(data.items) ? data.items : [];
        var totalCount = data && Number(data.total_count || 0);
        var isEnd = data && data.is_end === true;

        if (!target) {
            return;
        }

        UX.setText(byId("addressSearchPageLabel"), String(state.currentPage));
        UX.setDisabled(byId("btnAddressPrevPage"), state.loading || state.currentPage <= 1);
        UX.setDisabled(byId("btnAddressNextPage"), state.loading || isEnd || !items.length || state.currentPage * 8 >= totalCount);

        if (!items.length) {
            target.innerHTML = "<div class=\"detail-empty\">검색 결과가 없습니다.</div>";
            return;
        }

        target.innerHTML = items.map(function (item) {
            var selected = item.selected_address || item.road_address || item.address_name || item.jibun_address || "-";
            var road = item.road_address || item.address_name || "-";
            var jibun = item.jibun_address || "-";
            var place = item.place_name || item.building_name || "";
            var zipNo = item.zip_no || "-";
            return [
                "<button type=\"button\" class=\"address-search-item\" data-address=\"", UX.esc(selected), "\">",
                "  <strong>", UX.esc(road), "</strong>",
                place ? "  <span>" + UX.esc(place) + "</span>" : "",
                "  <span>지번 " + UX.esc(jibun) + "</span>",
                "  <span>우편번호 " + UX.esc(zipNo) + "</span>",
                "</button>"
            ].join("");
        }).join("");

        UX.qsa(".address-search-item", target).forEach(function (button) {
            UX.bindOnce(button, "click", function () {
                var selected = button.getAttribute("data-address") || "";
                if (state.onSelect) {
                    state.onSelect(selected);
                }
                close();
            });
        });
    }

    function loadConfig() {
        if (state.config) {
            return Promise.resolve(state.config);
        }
        return UX.requestJson("/map/config.json", {}).then(function (response) {
            state.config = response && response.ok === true ? (response.data || {}) : { search_enabled: false };
            return state.config;
        }).catch(function () {
            state.config = { search_enabled: false, message: "지도 검색 설정을 불러오지 못했습니다." };
            return state.config;
        });
    }

    function search() {
        var keyword = state.keyword || byId("addressSearchKeyword").value.trim();
        if (!keyword) {
            setMessage("검색어를 입력하세요.", "error");
            renderResults({ items: [], total_count: 0, is_end: true });
            return;
        }

        setLoading(true);
        setMessage("카카오 지도에서 주소를 검색하는 중입니다.", "");
        UX.requestJson("/map/address-search.json", {
            keyword: keyword,
            current_page: state.currentPage,
            count_per_page: 8
        }).then(function (response) {
            var data = response && response.data ? response.data : {};
            if (!response || response.ok !== true || data.available !== true) {
                setMessage(formatErrorMessage(data.message), "error");
                renderResults({ items: [], total_count: 0, is_end: true });
                return;
            }
            setMessage("카카오 검색 결과입니다. 사용할 주소를 선택하세요.", "success");
            renderResults(data);
        }).catch(function () {
            setMessage("주소 검색 요청에 실패했습니다.", "error");
            renderResults({ items: [], total_count: 0, is_end: true });
        }).finally(function () {
            setLoading(false);
        });
    }

    function open(options) {
        var config;
        ensureModal();
        options = options || {};
        state.onSelect = typeof options.onSelect === "function" ? options.onSelect : null;
        state.currentPage = 1;
        state.keyword = options.keyword || "";
        UX.setText(byId("addressSearchTitle"), options.title || "주소 검색");
        byId("addressSearchKeyword").value = state.keyword;
        byId("addressSearchResults").innerHTML = "<div class=\"detail-empty\">검색어를 입력하고 검색하세요.</div>";
        setMessage("", "");
        byId("addressSearchModal").hidden = false;
        byId("addressSearchKeyword").focus();

        return loadConfig().then(function (loadedConfig) {
            config = loadedConfig || {};
            if (!config.search_enabled) {
                setMessage(config.message || "카카오 주소 검색 API가 설정되지 않았습니다.", "error");
                return;
            }
            if (state.keyword) {
                search();
            }
        });
    }

    function close() {
        var modal = byId("addressSearchModal");
        if (!modal) {
            return;
        }
        modal.hidden = true;
    }

    function formatErrorMessage(message) {
        var text = (message || "").trim();
        if (!text) {
            return "카카오 주소 검색에 실패했습니다.";
        }
        return "카카오 주소 검색 응답: " + text;
    }

    global.AddressSearch = {
        open: open,
        close: close
    };
})(window);
