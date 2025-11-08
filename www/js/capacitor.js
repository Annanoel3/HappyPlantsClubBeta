// Capacitor stub - only for pure browser testing.
// Guard so it does NOT override the native Capacitor object in the mobile app.
(function() {
  // If the real Capacitor is already present, do nothing
  if (window.Capacitor) return;

  // Heuristic: only stub in desktop browsers, not in Android/iOS WebView
  const ua = navigator.userAgent || '';
  const isMobileOS = /Android|iPhone|iPad|iPod/i.test(ua);
  const isStandaloneWeb = !isMobileOS;

  if (isStandaloneWeb) {
    window.Capacitor = {
      isNativePlatform: () => false,
      getPlatform: () => 'web',
      Plugins: {}
    };
  }
})();