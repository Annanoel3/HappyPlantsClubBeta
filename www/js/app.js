// Wrapper Bootstrap for Capacitor 7

const PLAYER_ID_RETRY_MAX_ATTEMPTS = 5;
const PLAYER_ID_RETRY_DELAY_MS = 1000;
const INITIAL_PLAYER_ID_DELAY_MS = 2000; // Wait 2 seconds after device ready before initial Player ID retrieval
const HAPPYPLANTS_APP_URL = 'https://happyplantsclub.base44.app';

// Track pending external user IDs so we can retry once the native NotifyBridge plugin becomes available.
const pendingExternalUserIdQueue = [];
let notifyBridgeWatcher = null;
let isProcessingExternalUserId = false;
let lastSuccessfulExternalUserId = null;
let notifyBridgePluginCheckLogged = false;

// Listen for messages from the iframe to set external user ID
console.log('[OneSignal Wrapper] Setting up postMessage listener...');
window.addEventListener('message', function(event) {
    console.log('[OneSignal Wrapper] Received postMessage:', event.data);

    if (event.data && event.data.type === 'setOneSignalExternalUserId') {
        const externalUserId = event.data.externalUserId;
        queueExternalUserIdRequest(externalUserId, 'postMessage');
    } else if (event.data && event.data.type === 'oneSignalLogout') {
        logoutOneSignal();
    }
});

function getNotifyBridgePlugin() {
    return window.NotifyBridge || window.Capacitor?.Plugins?.NotifyBridge || null;
}

function setOneSignalExternalUserId(externalUserId, sourceLabel) {
    queueExternalUserIdRequest(externalUserId, sourceLabel || 'direct call');
}

function queueExternalUserIdRequest(externalUserId, source) {
    const normalizedExternalUserId = normalizeExternalUserId(externalUserId);

    if (!normalizedExternalUserId) return;
    if (shouldIgnoreExternalUserId(normalizedExternalUserId, source)) return;
    if (normalizedExternalUserId === lastSuccessfulExternalUserId) return;
    if (pendingExternalUserIdQueue.some(entry => entry.value === normalizedExternalUserId)) return;

    pendingExternalUserIdQueue.push({ value: normalizedExternalUserId, source });
    processExternalUserIdQueue();
}

function normalizeExternalUserId(externalUserId) {
    if (externalUserId === null || externalUserId === undefined) return '';
    return String(externalUserId).trim();
}

function shouldIgnoreExternalUserId(externalUserId, source) {
    if (!externalUserId) return true;
    const looksLikeUrl = externalUserId.startsWith('http://') || externalUserId.startsWith('https://');
    const looksLikeAppUrl = externalUserId === HAPPYPLANTS_APP_URL;
    if (looksLikeUrl || looksLikeAppUrl) return true;
    return false;
}

function processExternalUserIdQueue() {
    if (!pendingExternalUserIdQueue.length || isProcessingExternalUserId) return;
    if (!isNotifyBridgeAvailable()) {
        startNotifyBridgeWatcher();
        return;
    }

    const currentRequest = pendingExternalUserIdQueue[0];

    // === NEW: wait for valid playerId before .login ===
    getNotifyBridgePlugin().getPlayerId().then(function(response) {
        const playerId = response && response.playerId ? response.playerId : '';
        if (!playerId) {
            console.log('[OneSignal Wrapper] Waiting for valid playerId before calling login...');
            setTimeout(processExternalUserIdQueue, 500); // Retry
            return;
        }

        console.log(`[OneSignal Wrapper] Ready to map external user ID (${currentRequest.value}) to playerId (${playerId})`);
        isProcessingExternalUserId = true;

        getNotifyBridgePlugin().login({ externalId: currentRequest.value })
        .then(function(loginResponse) {
            console.log(`[OneSignal Wrapper] ✅ External user ID set via NotifyBridge (${currentRequest.source})`);
            lastSuccessfulExternalUserId = currentRequest.value;
            notifyIframe(true, currentRequest.value, playerId);
            pendingExternalUserIdQueue.shift();
            isProcessingExternalUserId = false;
            processExternalUserIdQueue();
        })
        .catch(function(error) {
            console.error(`[OneSignal Wrapper] ❌ Failed to set external user ID (${currentRequest.source}):`, error);
            isProcessingExternalUserId = false;
            notifyIframe(false, error, '');
            setTimeout(processExternalUserIdQueue, 500);
        });
    }).catch(function(getIdError) {
        console.error(`[OneSignal Wrapper] ❌ Error getting player ID:`, getIdError);
        setTimeout(processExternalUserIdQueue, 500);
    });
}

function sendExternalUserIdToNotifyBridge(externalUserId) {
    const notifyBridge = getNotifyBridgePlugin();
    if (!notifyBridge) return Promise.reject(new Error('NotifyBridge plugin not available'));
    return notifyBridge.login({ externalId: externalUserId });
}

function logoutOneSignal() {
    const notifyBridge = getNotifyBridgePlugin();
    if (!notifyBridge) return;
    notifyBridge.logout().then(()=>{}).catch(()=>{});
}

function notifyIframe(success, data, playerId) {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
            type: 'oneSignalExternalUserIdSet',
            success,
            data,
            playerId: playerId || ''
        }, HAPPYPLANTS_APP_URL);
    }
}

function isNotifyBridgeAvailable() {
    const notifyBridge = getNotifyBridgePlugin();
    if (notifyBridge && typeof notifyBridge.login === 'function') return true;
    try {
        if (typeof window.Capacitor?.Plugins !== 'undefined' && !notifyBridgePluginCheckLogged) {
            const pluginKeys = Object.keys(window.Capacitor.Plugins || {});
            if (pluginKeys.length > 0) {
                console.log('[OneSignal Wrapper] Available plugin keys:', pluginKeys);
                notifyBridgePluginCheckLogged = true;
            }
        }
    } catch (e) { /* Ignore errors */ }
    return false;
}

function startNotifyBridgeWatcher() {
    if (!pendingExternalUserIdQueue.length) return;
    if (isNotifyBridgeAvailable()) {
        processExternalUserIdQueue();
        return;
    }
    if (notifyBridgeWatcher) return;
    notifyBridgeWatcher = setInterval(function() {
        if (isNotifyBridgeAvailable()) {
            clearInterval(notifyBridgeWatcher);
            notifyBridgeWatcher = null;
            processExternalUserIdQueue();
        }
    }, 500);
}

function flushPendingExternalUserId() {
    processExternalUserIdQueue();
}

// Wait for Capacitor to be ready (Cordova/Capacitor hybrid)
document.addEventListener('deviceready', function() {
    if (window.Capacitor && window.Capacitor.registerPlugin) {
        window.NotifyBridge = window.Capacitor.registerPlugin('NotifyBridge');
    }
    requestNotificationPermission();
    flushPendingExternalUserId();
    setTimeout(function() { sendPlayerIdToIframe(); }, INITIAL_PLAYER_ID_DELAY_MS);
}, false);

function requestNotificationPermission() {
    const notifyBridge = getNotifyBridgePlugin();
    if (!notifyBridge) return;
    notifyBridge.requestPermission().then(()=>{}).catch(()=>{});
}

// Player ID flows
function sendPlayerIdToIframe() {
    tryGetPlayerIdWithRetry(0);
}

function schedulePlayerIdRetry(attemptNumber) {
    if (attemptNumber < PLAYER_ID_RETRY_MAX_ATTEMPTS) {
        setTimeout(function() {
            tryGetPlayerIdWithRetry(attemptNumber + 1);
        }, PLAYER_ID_RETRY_DELAY_MS);
    }
}

function tryGetPlayerIdWithRetry(attemptNumber) {
    const notifyBridge = getNotifyBridgePlugin();
    if (!notifyBridge) { schedulePlayerIdRetry(attemptNumber); return; }
    notifyBridge.getPlayerId().then(function(response) {
        const playerId = response && response.playerId ? response.playerId : '';
        if (!playerId) { schedulePlayerIdRetry(attemptNumber); return; }
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'oneSignalPlayerId',
                playerId: playerId
            }, HAPPYPLANTS_APP_URL);
        }
    }).catch(()=>{ schedulePlayerIdRetry(attemptNumber); });
}

// JS fallback for browser
if (!window.Capacitor) {
    console.log('[OneSignal Wrapper] Running in browser mode - Capacitor features not available');
}