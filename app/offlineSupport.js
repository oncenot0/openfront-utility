import { showToast } from "./toast.js";
/**
 * Registers the service worker (see scripts/sw-template.js) that caches the
 * whole app, so it keeps working with no internet.
 */
export function setupOfflineSupport() {
    if (!("serviceWorker" in navigator))
        return;
    const secure = location.protocol === "https:" ||
        location.hostname === "localhost" ||
        /^127\./.test(location.hostname);
    if (!secure)
        return;
    // A returning visitor already has a worker; a first-time visitor does not.
    const hadWorker = navigator.serviceWorker.controller !== null;
    navigator.serviceWorker.addEventListener("message", (event) => {
        var _a;
        if (((_a = event.data) === null || _a === void 0 ? void 0 : _a.type) !== "sw-activated")
            return;
        if (hadWorker) {
            showToast("A new version is ready. Reload the page to update.", 6000);
        }
        else {
            showToast("Saved for offline use. You can keep drawing without internet.", 5000);
        }
    });
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch((error) => {
            console.warn("Offline mode unavailable:", error);
        });
    });
}
