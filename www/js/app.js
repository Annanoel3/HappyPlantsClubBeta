// Configuration
// Update this if your Base44 app URL changes
const BASE44_APP_URL = 'https://happyplantsclub.base44.app';

// Retry configuration for Player ID retrieval
const PLAYER_ID_RETRY_MAX_ATTEMPTS = 5;
const PLAYER_ID_RETRY_DELAY_MS = 1000;
const INITIAL_PLAYER_ID_DELAY_MS = 2000; // Wait 2 seconds after device ready before initial Player ID retrieval

// Track pending external user IDs so we can retry once the native
// NotifyBridge plugin becomes available.
const pendingExternalUserIdQueue = [];
let notifyBridgeWatcher = null;
let isProcessingExternalUserId = false;
let lastSuccessfulExternalUserId = null;
let notifyBridgePluginCheckLogged = false; // Track if we've logged plugin keys

// Listen for messages from the iframe to set external user ID
// This works with the native NotifyBridge plugin
console.log('[OneSignal Wrapper] Setting up postMessage listener...');
window.addEventListener('message', function(event) {
    console.log('[OneSignal Wrapper] Received postMessage:', event.data);

    // Accept messages from your Base44 app origin
    if (event.data && event.data.type === 'setOneSignalExternalUserId') {
        const externalUserId = event.data.externalUserId;
        console.log('[OneSignal Wrapper] Request to set external user ID (postMessage):', externalUserId);

        queueExternalUserIdRequest(externalUserId, 'postMessage');
    } else if (event.data && event.data.type === 'oneSignalLogout') {
        console.log('[OneSignal Wrapper] Request to logout from OneSignal');
        logoutOneSignal();
    }
});

/**
 * Helper function to get the NotifyBridge plugin instance
 * Checks both the registered plugin and Capacitor.Plugins for compatibility
 * 
 * @returns {Object|null} The NotifyBridge plugin instance or null if not available
 */
function getNotifyBridgePlugin() {
    // Use optional chaining for cleaner code
    return window.NotifyBridge || window.Capacitor?.Plugins?.NotifyBridge || null;
}

// Function to set external user ID using the NotifyBridge plugin
function setOneSignalExternalUserId(externalUserId, sourceLabel) {
    queueExternalUserIdRequest(externalUserId, sourceLabel || 'direct call');
}

function queueExternalUserIdRequest(externalUserId, source) {
    const normalizedExternalUserId = normalizeExternalUserId(externalUserId);

    if (!normalizedExternalUserId) {
        console.warn(`[OneSignal Wrapper] Ignoring empty external user ID from ${source}`);
        return;
    }

    if (shouldIgnoreExternalUserId(normalizedExternalUserId, source)) {
        return;
    }

    if (normalizedExternalUserId === lastSuccessfulExternalUserId) {
        console.log(`[OneSignal Wrapper] External user ID from ${source} matches the last successful value; skipping duplicate:`, normalizedExternalUserId);
        return;
    }

    const alreadyQueued = pendingExternalUserIdQueue.some(function(entry) {
        return entry.value === normalizedExternalUserId;
    });

    if (alreadyQueued) {
        console.log(`[OneSignal Wrapper] External user ID from ${source} is already queued; skipping duplicate.`);
        return;
    }

    pendingExternalUserIdQueue.push({
        value: normalizedExternalUserId,
        source: source
    });

    console.log(`[OneSignal Wrapper] Queued external user ID (${source}):`, normalizedExternalUserId);

    processExternalUserIdQueue();
}

function normalizeExternalUserId(externalUserId) {
    if (externalUserId === null || externalUserId === undefined) {
        return '';
    }

    if (typeof externalUserId === 'string') {
        return externalUserId.trim();
    }

    return String(externalUserId).trim();
}

function shouldIgnoreExternalUserId(externalUserId, source) {
    if (!externalUserId) {
        return true;
    }

    const looksLikeUrl = externalUserId.startsWith('http://') || externalUserId.startsWith('https://');
    const looksLikeAppUrl = externalUserId === BASE44_APP_URL;

    if (looksLikeUrl || looksLikeAppUrl) {
        console.warn(`[OneSignal Wrapper] Ignoring suspicious external user ID from ${source}:`, externalUserId);
        return true;
    }

    return false;
}

function processExternalUserIdQueue() {
    if (!pendingExternalUserIdQueue.length) {
        return;
    }

    if (isProcessingExternalUserId) {
        return;
    }

    if (!isNotifyBridgeAvailable()) {
        console.warn('[OneSignal Wrapper] NotifyBridge plugin not available yet; waiting before processing queued external user IDs');
        startNotifyBridgeWatcher();
        return;
    }

    const currentRequest = pendingExternalUserIdQueue[0];

    console.log(`[OneSignal Wrapper] Processing queued external user ID from ${currentRequest.source}:`, currentRequest.value);

    isProcessingExternalUserId = true;

    try {
        sendExternalUserIdToNotifyBridge(currentRequest.value)
            .then(function(response) {
                console.log(`[OneSignal Wrapper] ✅ External user ID set successfully via NotifyBridge (${currentRequest.source})`);
                
                // Extract player ID from response
                const playerId = response && response.playerId ? response.playerId : '';
                console.log(`[OneSignal Wrapper] Player ID: ${playerId}`);
                
                lastSuccessfulExternalUserId = currentRequest.value;
                notifyIframe(true, currentRequest.value, playerId);
                pendingExternalUserIdQueue.shift();
                isProcessingExternalUserId = false;

                if (!pendingExternalUserIdQueue.length && notifyBridgeWatcher) {
                    clearInterval(notifyBridgeWatcher);
                    notifyBridgeWatcher = null;
                }

                processExternalUserIdQueue();
            })
            .catch(function(error) {
                console.error(`[OneSignal Wrapper] ❌ Failed to set external user ID (${currentRequest.source}):`, error);
                isProcessingExternalUserId = false;

                const shouldRetryLater = !isNotifyBridgeAvailable();
                if (shouldRetryLater) {
                    startNotifyBridgeWatcher();
                } else {
                    pendingExternalUserIdQueue.shift();
                }

                notifyIframe(false, error, '');

                if (!shouldRetryLater) {
                    processExternalUserIdQueue();
                }
            });
    } catch (error) {
        console.error(`[OneSignal Wrapper] ❌ Exception while setting external user ID (${currentRequest.source}):`, error);
        isProcessingExternalUserId = false;

        const shouldRetryLater = !isNotifyBridgeAvailable();
        if (shouldRetryLater) {
            startNotifyBridgeWatcher();
        } else {
            pendingExternalUserIdQueue.shift();
        }

        notifyIframe(false, error, '');

        if (!shouldRetryLater) {
            processExternalUserIdQueue();
        }
    }
}

function sendExternalUserIdToNotifyBridge(externalUserId) {
    console.log('[OneSignal Wrapper] Attempting to send external user ID to NotifyBridge:', externalUserId);

    const notifyBridge = getNotifyBridgePlugin();
    
    if (!notifyBridge) {
        return Promise.reject(new Error('NotifyBridge plugin not available'));
    }
    
    // Call the native NotifyBridge plugin
    // This will return both the playerId and externalId
    return notifyBridge.login({ externalId: externalUserId });
}

// Function to logout from OneSignal using the NotifyBridge plugin
function logoutOneSignal() {
    console.log('[OneSignal Wrapper] Logging out from OneSignal via NotifyBridge');

    try {
        const notifyBridge = getNotifyBridgePlugin();
        
        if (!notifyBridge) {
            console.error('[OneSignal Wrapper] ❌ NotifyBridge plugin not available');
            console.log('[OneSignal Wrapper] Available plugins:', window.Capacitor?.Plugins ? Object.keys(window.Capacitor.Plugins) : 'Capacitor not loaded');
            return;
        }

        // Call the native NotifyBridge plugin logout method
        notifyBridge.logout()
            .then(function() {
                console.log('[OneSignal Wrapper] ✅ OneSignal logout successful');
            })
            .catch(function(error) {
                console.error('[OneSignal Wrapper] ❌ Failed to logout from OneSignal:', error);
            });
    } catch (error) {
        console.error('[OneSignal Wrapper] ❌ Exception while logging out from OneSignal:', error);
    }
}

// Helper function to notify the iframe
function notifyIframe(success, data, playerId) {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
            type: 'oneSignalExternalUserIdSet',
            success: success,
            data: data,
            playerId: playerId || ''
        }, BASE44_APP_URL);
    }
}

function isNotifyBridgeAvailable() {
    // In Capacitor 7+, plugins might not appear in window.Capacitor.Plugins immediately
    // Use the helper function to check if plugin is available
    if (!window.Capacitor) {
        return false;
    }
    
    const notifyBridge = getNotifyBridgePlugin();
    
    if (notifyBridge && typeof notifyBridge.login === 'function') {
        return true;
    }
    
    // Debug: log available plugins once
    try {
        if (typeof window.Capacitor.Plugins !== 'undefined') {
            const pluginKeys = Object.keys(window.Capacitor.Plugins || {});
            if (pluginKeys.length > 0 && !notifyBridgePluginCheckLogged) {
                console.log('[OneSignal Wrapper] Available plugin keys:', pluginKeys);
                notifyBridgePluginCheckLogged = true;
            }
        }
    } catch (e) {
        // Safely ignore errors during debug logging - this is a non-critical diagnostic feature
        // Errors here won't affect plugin functionality
    }
    
    return false;
}

function startNotifyBridgeWatcher() {
    if (!pendingExternalUserIdQueue.length) {
        return;
    }

    if (isNotifyBridgeAvailable()) {
        processExternalUserIdQueue();
        return;
    }

    if (notifyBridgeWatcher) {
        return;
    }

    console.log('[OneSignal Wrapper] Waiting for NotifyBridge plugin to become available...');
    notifyBridgeWatcher = setInterval(function() {
        if (isNotifyBridgeAvailable()) {
            console.log('[OneSignal Wrapper] ✅ NotifyBridge plugin detected; processing pending external user ID requests');
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
    console.log('[OneSignal Wrapper] ✅ Device is ready, Capacitor initialized');
    console.log('[OneSignal Wrapper] Available Capacitor plugins:', window.Capacitor?.Plugins ? Object.keys(window.Capacitor.Plugins) : 'None');
    console.log('[OneSignal Wrapper] OneSignal is initialized in native code (MainActivity.java)');

setTimeout(() => {
  console.log('[Diag] Late plugin keys:', window.Capacitor?.Plugins && Object.keys(window.Capacitor.Plugins));
  console.log('[Diag] NotifyBridge exists?', !!(window.Capacitor?.Plugins?.NotifyBridge || window.NotifyBridge));
}, 1500);

    // Register NotifyBridge plugin for Capacitor 7+
    // This ensures the plugin is accessible after Capacitor is fully initialized
    if (window.Capacitor && window.Capacitor.registerPlugin) {
        console.log('[OneSignal Wrapper] Registering NotifyBridge plugin...');
        try {
            window.NotifyBridge = window.Capacitor.registerPlugin('NotifyBridge');
            console.log('[OneSignal Wrapper] ✅ NotifyBridge plugin registered successfully');
            console.log('[OneSignal Wrapper] NotifyBridge methods:', Object.keys(window.NotifyBridge || {}));
        } catch (error) {
            console.error('[OneSignal Wrapper] ❌ Failed to register NotifyBridge plugin:', error);
        }
    } else {
        console.warn('[OneSignal Wrapper] ⚠️ Capacitor.registerPlugin not available');
    }

    // Request notification permission to establish OneSignal communication
    requestNotificationPermission();

    // Retry any pending external user IDs now that Capacitor is ready.
    flushPendingExternalUserId();
    
    // Send initial player ID to iframe after a delay to ensure OneSignal is ready
    setTimeout(function() {
        sendPlayerIdToIframe();
    }, INITIAL_PLAYER_ID_DELAY_MS);
}, false);

// Function to request notification permission
function requestNotificationPermission() {
    console.log('[OneSignal Wrapper] Requesting notification permission...');

    try {
        const notifyBridge = getNotifyBridgePlugin();
        
        if (!notifyBridge) {
            console.error('[OneSignal Wrapper] ❌ NotifyBridge plugin not available for permission request');
            return;
        }

        // Call the native NotifyBridge plugin to request permission
        notifyBridge.requestPermission()
            .then(function() {
                console.log('[OneSignal Wrapper] ✅ Notification permission requested successfully');
            })
            .catch(function(error) {
                console.error('[OneSignal Wrapper] ❌ Failed to request notification permission:', error);
            });
    } catch (error) {
        console.error('[OneSignal Wrapper] ❌ Exception while requesting notification permission:', error);
    }
}

// Function to send Player ID to iframe
function sendPlayerIdToIframe() {
    console.log('[OneSignal Wrapper] Getting Player ID to send to iframe...');
    
    tryGetPlayerIdWithRetry(0);
}

/**
 * Helper function to schedule a retry attempt
 * @param {number} attemptNumber - Current attempt number
 */
function schedulePlayerIdRetry(attemptNumber) {
    if (attemptNumber < PLAYER_ID_RETRY_MAX_ATTEMPTS) {
        console.log(`[OneSignal Wrapper] Retrying in ${PLAYER_ID_RETRY_DELAY_MS}ms (attempt ${attemptNumber + 1}/${PLAYER_ID_RETRY_MAX_ATTEMPTS})...`);
        setTimeout(function() {
            tryGetPlayerIdWithRetry(attemptNumber + 1);
        }, PLAYER_ID_RETRY_DELAY_MS);
    } else {
        console.error('[OneSignal Wrapper] ❌ Failed to get Player ID after', PLAYER_ID_RETRY_MAX_ATTEMPTS, 'attempts');
    }
}

// Helper function to retry getting Player ID if it's not available yet
function tryGetPlayerIdWithRetry(attemptNumber) {
    try {
        const notifyBridge = getNotifyBridgePlugin();
        
        if (!notifyBridge) {
            console.error('[OneSignal Wrapper] ❌ NotifyBridge plugin not available to get Player ID');
            schedulePlayerIdRetry(attemptNumber);
            return;
        }

        // Call the native NotifyBridge plugin to get the Player ID
        notifyBridge.getPlayerId()
            .then(function(response) {
                const playerId = response && response.playerId ? response.playerId : '';
                
                if (!playerId || playerId === '') {
                    console.warn('[OneSignal Wrapper] ⚠️ Player ID is empty');
                    schedulePlayerIdRetry(attemptNumber);
                    return;
                }
                
                console.log('[OneSignal Wrapper] ✅ Player ID retrieved:', playerId);
                
                // Send Player ID to iframe
                const iframe = document.querySelector('iframe');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'oneSignalPlayerId',
                        playerId: playerId
                    }, BASE44_APP_URL);
                    console.log('[OneSignal Wrapper] ✅ Player ID sent to iframe');
                } else if (!iframe) {
                    console.warn('[OneSignal Wrapper] ⚠️ Could not find iframe to send Player ID');
                }
            })
            .catch(function(error) {
                console.error('[OneSignal Wrapper] ❌ Failed to get Player ID:', error);
                schedulePlayerIdRetry(attemptNumber);
            });
    } catch (error) {
        console.error('[OneSignal Wrapper] ❌ Exception while getting Player ID:', error);
        schedulePlayerIdRetry(attemptNumber);
    }
}

// Fallback for when running in browser without Capacitor
if (!window.Capacitor) {
    console.log('[OneSignal Wrapper] Running in browser mode - Capacitor features not available');
}
