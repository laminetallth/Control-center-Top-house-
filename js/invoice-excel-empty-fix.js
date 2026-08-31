(function () {
    "use strict";
    function patch() {
        if (!window.XLSX || window.XLSX.__topHouseEmptyWorkbookGuard) return !!window.XLSX;
        const originalWriteFile = window.XLSX.writeFile;
        window.XLSX.writeFile = function (workbook, filename, options) {
            if (workbook && Array.isArray(workbook.SheetNames) && workbook.SheetNames.length === 0) return;
            return originalWriteFile.call(this, workbook, filename, options);
        };
        window.XLSX.__topHouseEmptyWorkbookGuard = true;
        return true;
    }
    if (!patch()) setInterval(() => { if (patch()) clearInterval(timer); }, 200);
    const timer = setInterval(() => { if (patch()) clearInterval(timer); }, 200);
})();
