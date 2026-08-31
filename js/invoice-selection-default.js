(function () {
    "use strict";
    let initialized = false;
    function init() {
        const vendor = document.getElementById("vendorFilter");
        const selectAll = document.getElementById("invoiceSelectAll");
        if (!vendor || !selectAll || !vendor.value || initialized) return;
        if (!localStorage.getItem("invoiceInvitationSelectedTopHouse")) {
            initialized = true;
            selectAll.click();
        }
    }
    setInterval(init, 300);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
})();
