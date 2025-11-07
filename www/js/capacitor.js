// Capacitor stub - the actual Capacitor.js will be injected by the native bridge
// This file exists to prevent errors if scripts load before Capacitor is ready

if (!window.Capacitor) {
    window.Capacitor = {
        Plugins: {},
        platform: 'web'
    };
    console.log('[Capacitor] Stub loaded - waiting for native bridge...');
}
