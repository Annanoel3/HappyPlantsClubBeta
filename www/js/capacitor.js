// Capacitor stub for desktop browser testing ONLY.
// - Never override the real Capacitor object in native apps.
// - Only create a stub when running on a desktop browser over http(s).

(function () {
  // If native Capacitor is already present (or says it's native), do nothing.
  if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
    return;
  }
  if (window.Capacitor) {
    // If Capacitor exists at all, assume it's the real one and don't touch it.
    return;
  }

  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
  const looksLikeMobileUA = /Android|iPhone|iPad|iPod/i.test(ua);

  // Contexts that indicate a native/webview app – DO NOT STUB
  const isFileScheme = typeof location !== 'undefined' && location.protocol === 'file:';
  const isCapacitorScheme = typeof location !== 'undefined' && location.protocol === 'capacitor:';
  const isAndroidAsset = typeof location !== 'undefined' && (location.href || '').indexOf('android_asset') !== -1;

  // Also treat localhost in native apps cautiously; only stub if clearly desktop.
  const isLocalhost = typeof location !== 'undefined' && location.hostname === 'localhost';

  // If it looks like mobile/webview or app bundle, bail out (do not create stub).
  if (looksLikeMobileUA || isFileScheme || isCapacitorScheme || isAndroidAsset) {
    return;
  }

  // Otherwise, we're in a plain desktop browser. Provide a minimal stub.
  const Cap = {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
    Plugins: {},
    // Optional: provide a no-op registerPlugin so code doesn't crash in web testing.
    registerPlugin: (name) => {
      const noOp = new Proxy({}, {
        get() {
          // Each plugin method returns a rejected promise in web mode.
          return () => Promise.reject(new Error(`[Capacitor stub] Plugin "${name}" is not available in web mode.`));
        }
      });
      Cap.Plugins[name] = noOp;
      return noOp;
    }
  };

  Object.defineProperty(window, 'Capacitor', {
    value: Cap,
    writable: false,
    configurable: true, // allows native to overwrite if needed (extra safety)
  });
})();