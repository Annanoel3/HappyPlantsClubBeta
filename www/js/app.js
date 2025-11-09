// Wrapper Bootstrap for Capacitor 7 + OneSignal

const PLAYER_ID_RETRY_MAX_ATTEMPTS = 10;
const PLAYER_ID_RETRY_DELAY_MS = 1000;
const INITIAL_PLAYER_ID_DELAY_MS = 2000;
const HAPPYPLANTS_APP_URL = 'https://happyplantsclub.base44.app';

// Queue external user IDs to set on OneSignal
const pendingExternalUserIdQueue = [];
let notifyBridgeWatcher = null;
let isProcessingExternalUserId = false;
let lastSuccessfulExternalUserId = null;
let notifyBridgePluginCheckLogged = false;

console.log('[OneSignal Wrapper] Setting up postMessage listener...');
window.addEventListener('message', function(event) {
    console.log('[OneSignal Wrapper] Received postMessage:', event.data);

    if (event.data && event.data.type === 'setOneSignalExternalUserId') {
        queueExternalUserIdRequest(event.data.externalUserId, 'postMessage');
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
    if (!normalizedExternalUserId) {
        console.warn(`[OneSignal Wrapper] Ignoring empty external user ID from ${source}`);
        return;
    }
    if (shouldIgnoreExternalUserId(normalizedExternalUserId, source)) return;
    if (normalizedExternalUserId === lastSuccessfulExternalUserId) return;
    if (pendingExternalUserIdQueue.some(entry => entry.value === normalizedExternalUserId)) return;

    pendingExternalUserIdQueue.push({ value: normalizedExternalUserId, source });
    processExternalUserIdQueue();
}

function normalizeExternalUserId(externalUserId) {
    if (externalUserId == null) return '';
    return String(externalUserId).trim();
}

function shouldIgnoreExternalUserId(externalUserId, source) {
    if (!externalUserId) return true;
    const looksLikeUrl = externalUserId.startsWith('http://') || externalUserId.startsWith('https://');
    const looksLikeAppUrl = externalUserId === HAPPYPLANTS_APP_URL;
    return looksLikeUrl || looksLikeAppUrl;
}

function processExternalUserIdQueue() {
    if (!pendingExternalUserIdQueue.length || isProcessingExternalUserId) return;
    if (!isNotifyBridgeAvailable()) {
        startNotifyBridgeWatcher();
        return;
    }

    const currentRequest = pendingExternalUserIdQueue[0];

    // === Wait for valid player/device ID before calling login! ===
    getNotifyBridgePlugin().getPlayerId().then(function(response) {
        const playerId = response && response.playerId ? response.playerId : '';
        if (!playerId) {
            console.log('[OneSignal Wrapper] Waiting for player/device ID to be ready before login...');
            setTimeout(processExternalUserIdQueue, 500); // Retry until OneSignal registration done
            return;
        }

        console.log(`[OneSignal Wrapper] Linking external user ID "${currentRequest.value}" to playerId "${playerId}"`);
        isProcessingExternalUserId = true;

        getNotifyBridgePlugin().login({ externalId: currentRequest.value })
        .then(function(loginResponse) {
            console.log(`[OneSignal Wrapper] ✅ External user ID "${currentRequest.value}" set in OneSignal`);
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
            setTimeout(processExternalUserIdQueue, 1200);
        });
    }).catch(function(getIdError) {
        console.error(`[OneSignal Wrapper] ❌ Error getting player/device ID:`, getIdError);
        setTimeout(processExternalUserIdQueue, 1500);
    });
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

// Wait for Capacitor to be ready
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

// Player ID retrieval/retry
function sendPlayerIdToIframe() { tryGetPlayerIdWithRetry(0); }

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

if (!window.Capacitor) {
    console.log('[OneSignal Wrapper] Running in browser mode - Capacitor features not available');
}