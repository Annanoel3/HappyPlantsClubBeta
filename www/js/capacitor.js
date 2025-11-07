// Capacitor stub - Capacitor runtime is injected by the native platform
// This file exists to prevent 404 errors when running in a browser
if (!window.Capacitor) {
    window.Capacitor = {
        isNativePlatform: () => false,
        getPlatform: () => 'web'
    };
}
