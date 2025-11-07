// Configuration
const BASE44_APP_URL = 'https://happyplantsclub.base44.app';

// Helper to get the NotifyBridge plugin
function getNotifyBridgePlugin() {
    return window.NotifyBridge || window.Capacitor?.Plugins?.NotifyBridge || null;
}

// Listen for messages from the web app
window.addEventListener('message', function(event) {
    console.log('[OneSignal] Received message:', event.data);
    
    if (event.data && event.data.type === 'setOneSignalExternalUserId') {
        const externalUserId = event.data.externalUserId;
        console.log('[OneSignal] Setting external user ID:', externalUserId);
        setOneSignalExternalUserId(externalUserId);
    }
});

// Set external user ID via NotifyBridge
function setOneSignalExternalUserId(externalUserId) {
    const notifyBridge = getNotifyBridgePlugin();
    
    if (!notifyBridge) {
        console.error('[OneSignal] NotifyBridge plugin not available');
        console.log('[OneSignal] Available plugins:', window.Capacitor?.Plugins ? Object.keys(window.Capacitor.Plugins) : 'No plugins');
        return;
    }

    console.log('[OneSignal] Calling NotifyBridge.login...');
    notifyBridge.login({ externalId: externalUserId })
        .then(function(response) {
            console.log('[OneSignal] ✅ External user ID set:', externalUserId);
            console.log('[OneSignal] Player ID:', response.playerId);
            
            // Notify the web app
            const iframe = document.querySelector('iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: 'oneSignalExternalUserIdSet',
                    success: true,
                    playerId: response.playerId,
                    externalId: externalUserId
                }, BASE44_APP_URL);
            }
        })
        .catch(function(error) {
            console.error('[OneSignal] ❌ Failed to set external user ID:', error);
            
            // Notify the web app of failure
            const iframe = document.querySelector('iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: 'oneSignalExternalUserIdSet',
                    success: false,
                    error: error.toString()
                }, BASE44_APP_URL);
            }
        });
}

// Request notification permission on device ready
document.addEventListener('deviceready', function() {
    console.log('[OneSignal] Device ready, requesting permission...');
    
    const notifyBridge = getNotifyBridgePlugin();
    if (notifyBridge) {
        console.log('[OneSignal] NotifyBridge plugin found, requesting permission...');
        notifyBridge.requestPermission()
            .then(function() {
                console.log('[OneSignal] ✅ Permission granted');
                
                // Get and log the player ID
                return notifyBridge.getPlayerId();
            })
            .then(function(response) {
                console.log('[OneSignal] Current Player ID:', response.playerId);
            })
            .catch(function(error) {
                console.error('[OneSignal] ❌ Permission error:', error);
            });
    } else {
        console.error('[OneSignal] NotifyBridge plugin not found!');
        console.log('[OneSignal] Available Capacitor plugins:', window.Capacitor?.Plugins ? Object.keys(window.Capacitor.Plugins) : 'Capacitor not loaded');
    }
}, false);

// Log when script loads
console.log('[OneSignal] app.js loaded');
console.log('[OneSignal] Capacitor available:', !!window.Capacitor);
