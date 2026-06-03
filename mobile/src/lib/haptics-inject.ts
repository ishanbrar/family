/** Injected into the Legatree WebView to request native haptics on common interactions. */
export const HAPTICS_INJECTED_SCRIPT = `
(function () {
  if (window.__legatreeHapticsInstalled) return;
  window.__legatreeHapticsInstalled = true;

  function post(style) {
    try {
      window.ReactNativeWebView?.postMessage(
        JSON.stringify({ type: "haptic", style: style || "light" })
      );
    } catch (_) {}
  }

  function styleForTarget(el) {
    if (!el || !el.closest) return "light";
    if (el.closest('[data-haptic="heavy"], [aria-pressed="true"]')) return "heavy";
    if (el.closest('button[type="submit"], [data-haptic="medium"]')) return "medium";
    if (el.closest("button, a[href], [role='button'], input[type='submit'], summary")) {
      return "light";
    }
    return "selection";
  }

  document.addEventListener(
    "click",
    function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest("[data-no-haptic]")) return;
      post(styleForTarget(t));
    },
    true
  );

  document.addEventListener(
    "change",
    function (e) {
      var t = e.target;
      if (!t) return;
      if (t.matches && t.matches("input[type='checkbox'], input[type='radio'], select")) {
        post("selection");
      }
    },
    true
  );
})();
true;
`;
