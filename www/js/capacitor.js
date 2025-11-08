// Only define stub if completely absent AND we are clearly in a pure browser (not Android/iOS native code)
// In capacitor.js
(function() {
  const nativeLikely = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!nativeLikely && !window.Capacitor) {
    window.Capacitor = { isNativePlatform: () => false, getPlatform: () => 'web' };
  }
})();