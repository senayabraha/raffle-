import { useEffect } from "react";

/**
 * Warns before losing in-progress form state: a real page unload (refresh,
 * tab close, typed URL) via beforeunload, and the browser Back/Forward
 * button via a popstate trap (pushState has no native blocking API in
 * React Router's non-data routers, so we intercept the history pop and
 * either undo it or let it through based on the user's choice).
 */
export function useConfirmOnLeave(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      if (window.confirm(message)) {
        // Drop both guards before navigating: leaving the beforeunload
        // listener armed past this point can surface a second native
        // "leave site?" prompt (or stall the navigation while the browser
        // resolves it) on top of the confirm() the user just answered.
        window.removeEventListener("popstate", handlePopState);
        window.removeEventListener("beforeunload", handleBeforeUnload);
        window.history.back();
      } else {
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [active, message]);
}
