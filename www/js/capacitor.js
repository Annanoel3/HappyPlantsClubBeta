// Only define stub if completely absent AND we are clearly in a pure browser (not Android/iOS native code)
(function() {
  const inNative = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && window.matchMedia('(pointer: coarse)').matches;
  if (!window.Capacitor && !inNative) {
    window.Capacitor = {
      isNativePlatform: () => false,
      getPlatform: () => 'web'
    };
  }
})();