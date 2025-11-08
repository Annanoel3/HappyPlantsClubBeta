// Wrapper Bootstrap for Capacitor 7 (no Cordova deviceready dependency)

// CONFIG
const BASE44_APP_URL = 'https://adhdone-73056b9b.base44.app';
const PLAYER_ID_RETRY_MAX_ATTEMPTS = 5;
const PLAYER_ID_RETRY_DELAY_MS = 1000;
const INITIAL_PLAYER_ID_DELAY_MS = 2000;

// STATE
const pendingExternalUserIdQueue = [];
let isProcessingExternalUserId = false;
let lastSuccessfulExternalUserId = null;
let notifyBridgeWatcher = null;
let notifyBridgePluginCheckLogged = false;
let pluginProbeInterval = null;
let pluginProbeCount = 0;
const PLUGIN_PROBE_MAX = 10; // 10 * 500ms = 5s

console.log('[Wrapper] Loading app.js at', new Date().toISOString());

// MESSAGE LISTENER (iframe -> wrapper)
window.addEventListener('message', (event) => {
  console.log('[Wrapper] Received postMessage:', event.data);
  if (!event.data || typeof event.data !== 'object') return;

  switch (event.data.type) {
    case 'setOneSignalExternalUserId':
      queueExternalUserIdRequest(event.data.externalUserId, 'postMessage');
      break;
    case 'oneSignalLogout':
      logoutOneSignal();
      break;
    default:
      // ignore other messages
      break;
  }
});

// PUBLIC API (if needed from console)
window.setOneSignalExternalUserId = (id) => queueExternalUserIdRequest(id, 'manual');
window.logoutOneSignal = logoutOneSignal;

// QUEUE HANDLING
function queueExternalUserIdRequest(externalUserId, source) {
  const normalized = normalizeExternalUserId(externalUserId);
  if (!normalized) {
    console.warn(`[Wrapper] Ignoring empty external user ID from ${source}`);
    return;
  }
  if (shouldIgnoreExternalUserId(normalized, source)) return;
  if (normalized === lastSuccessfulExternalUserId) {
    console.log(`[Wrapper] Duplicate of last successful external user ID (${source}); skipping.`);
    return;
  }
  if (pendingExternalUserIdQueue.some(e => e.value === normalized)) {
    console.log(`[Wrapper] Already queued (${source}); skipping duplicate.`);
    return;
  }
  pendingExternalUserIdQueue.push({ value: normalized, source });
  console.log(`[Wrapper] Queued external user ID (${source}):`, normalized);
  processExternalUserIdQueue();
}

function normalizeExternalUserId(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function shouldIgnoreExternalUserId(val, source) {
  if (!val) return true;
  const isUrl = /^https?:\/\//i.test(val);
  const isAppUrl = val === BASE44_APP_URL;
  if (isUrl || isAppUrl) {
    console.warn(`[Wrapper] Ignoring suspicious external user ID from ${source}:`, val);
    return true;
  }
  return false;
}

function processExternalUserIdQueue() {
  if (!pendingExternalUserIdQueue.length) return;
  if (isProcessingExternalUserId) return;

  if (!isNotifyBridgeAvailable()) {
    console.warn('[Wrapper] NotifyBridge not available; deferring queue processing.');
    startNotifyBridgeWatcher();
    return;
  }

  const current = pendingExternalUserIdQueue[0];
  console.log(`[Wrapper] Processing external user ID from ${current.source}:`, current.value);
  isProcessingExternalUserId = true;

  sendExternalUserIdToNotifyBridge(current.value)
    .then(resp => {
      console.log('[Wrapper] ✅ External user ID set via NotifyBridge:', current.value);
      const playerId = resp?.playerId || '';
      console.log('[Wrapper] Player ID:', playerId);
      lastSuccessfulExternalUserId = current.value;
      pendingExternalUserIdQueue.shift();
      isProcessingExternalUserId = false;
      notifyIframe(true, current.value, playerId);

      if (!pendingExternalUserIdQueue.length && notifyBridgeWatcher) {
        clearInterval(notifyBridgeWatcher);
        notifyBridgeWatcher = null;
      }
      processExternalUserIdQueue();
    })
    .catch(err => {
      console.error('[Wrapper] ❌ Failed to set external user ID:', err);
      isProcessingExternalUserId = false;
      const retryLater = !isNotifyBridgeAvailable();
      if (retryLater) startNotifyBridgeWatcher(); else pendingExternalUserIdQueue.shift();
      notifyIframe(false, err.message || String(err), '');
      if (!retryLater) processExternalUserIdQueue();
    });
}

function sendExternalUserIdToNotifyBridge(externalUserId) {
  const plugin = getNotifyBridgePlugin();
  if (!plugin) return Promise.reject(new Error('NotifyBridge plugin not available'));
  return plugin.login({ externalId: externalUserId });
}

// LOGOUT
function logoutOneSignal() {
  console.log('[Wrapper] Logging out via NotifyBridge');
  const plugin = getNotifyBridgePlugin();
  if (!plugin) {
    console.error('[Wrapper] ❌ NotifyBridge not available for logout');
    return;
  }
  plugin.logout()
    .then(() => console.log('[Wrapper] ✅ Logout successful'))
    .catch(e => console.error('[Wrapper] ❌ Logout failed:', e));
}

// IFRAME NOTIFICATION
function notifyIframe(success, data, playerId) {
  const iframe = document.querySelector('iframe');
  if (!iframe || !iframe.contentWindow) return;
  iframe.contentWindow.postMessage({
    type: 'oneSignalExternalUserIdSet',
    success,
    data,
    playerId: playerId || ''
  }, BASE44_APP_URL);
}

// PLUGIN DETECTION
function getNotifyBridgePlugin() {
  return window.NotifyBridge || window.Capacitor?.Plugins?.NotifyBridge || null;
}

function isNotifyBridgeAvailable() {
  const plugin = getNotifyBridgePlugin();
  if (plugin && typeof plugin.login === 'function') return true;

  if (window.Capacitor?.Plugins && !notifyBridgePluginCheckLogged) {
    const keys = Object.keys(window.Capacitor.Plugins);
    if (keys.length) {
      console.log('[Wrapper] Available plugin keys:', keys);
      notifyBridgePluginCheckLogged = true;
    }
  }
  return false;
}

function startNotifyBridgeWatcher() {
  if (!pendingExternalUserIdQueue.length) return;
  if (isNotifyBridgeAvailable()) {
    processExternalUserIdQueue();
    return;
  }
  if (notifyBridgeWatcher) return;

  console.log('[Wrapper] Waiting for NotifyBridge plugin...');
  notifyBridgeWatcher = setInterval(() => {
    if (isNotifyBridgeAvailable()) {
      console.log('[Wrapper] ✅ NotifyBridge detected; processing queue.');
      clearInterval(notifyBridgeWatcher);
      notifyBridgeWatcher = null;
      processExternalUserIdQueue();
    }
  }, 500);
}

// PLAYER ID
function sendPlayerIdToIframe() {
  console.log('[Wrapper] Initiating Player ID retrieval...');
  tryGetPlayerIdWithRetry(0);
}

function tryGetPlayerIdWithRetry(attempt) {
  const plugin = getNotifyBridgePlugin();
  if (!plugin) {
    console.warn('[Wrapper] Plugin not available for Player ID; scheduling retry.');
    return schedulePlayerIdRetry(attempt);
  }
  plugin.getPlayerId()
    .then(resp => {
      const playerId = resp?.playerId || '';
      if (!playerId) {
        console.warn('[Wrapper] Empty Player ID; retrying...');
        return schedulePlayerIdRetry(attempt);
      }
      console.log('[Wrapper] ✅ Player ID:', playerId);
      const iframe = document.querySelector('iframe');
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'oneSignalPlayerId', playerId }, BASE44_APP_URL);
        console.log('[Wrapper] Player ID sent to iframe');
      }
    })
    .catch(err => {
      console.error('[Wrapper] Player ID error:', err);
      schedulePlayerIdRetry(attempt);
    });
}

function schedulePlayerIdRetry(attempt) {
  if (attempt >= PLAYER_ID_RETRY_MAX_ATTEMPTS) {
    console.error('[Wrapper] ❌ Player ID retries exhausted');
    return;
  }
  console.log(`[Wrapper] Retrying Player ID in ${PLAYER_ID_RETRY_DELAY_MS}ms (attempt ${attempt + 1}/${PLAYER_ID_RETRY_MAX_ATTEMPTS})`);
  setTimeout(() => tryGetPlayerIdWithRetry(attempt + 1), PLAYER_ID_RETRY_DELAY_MS);
}

// PERMISSION
function requestNotificationPermission() {
  console.log('[Wrapper] Requesting notification permission (JS) ...');
  const plugin = getNotifyBridgePlugin();
  if (!plugin) {
    console.warn('[Wrapper] NotifyBridge unavailable for permission request');
    return;
  }
  plugin.requestPermission()
    .then(() => console.log('[Wrapper] ✅ Permission request invoked'))
    .catch(e => console.error('[Wrapper] ❌ Permission request failed:', e));
}

// BOOTSTRAP (no deviceready reliance)
function adoptOrRegisterPlugin() {
  if (!window.Capacitor) return;
  if (!window.NotifyBridge && window.Capacitor?.Plugins?.NotifyBridge) {
    window.NotifyBridge = window.Capacitor.Plugins.NotifyBridge;
    console.log('[Wrapper] Adopted NotifyBridge from Capacitor.Plugins');
  } else if (!window.NotifyBridge && window.Capacitor?.registerPlugin) {
    try {
      window.NotifyBridge = window.Capacitor.registerPlugin('NotifyBridge');
      console.log('[Wrapper] Registered NotifyBridge via registerPlugin');
    } catch (e) {
      console.warn('[Wrapper] registerPlugin failed:', e.message);
    }
  }
}

function startPluginProbes() {
  if (pluginProbeInterval) return;
  pluginProbeInterval = setInterval(() => {
    pluginProbeCount++;
    adoptOrRegisterPlugin();
    const available = isNotifyBridgeAvailable();
    console.log(`[Wrapper] Probe ${pluginProbeCount}/${PLUGIN_PROBE_MAX} NotifyBridge available?`, available);
    if (available || pluginProbeCount >= PLUGIN_PROBE_MAX) {
      clearInterval(pluginProbeInterval);
      pluginProbeInterval = null;
      console.log('[Wrapper] Final NotifyBridge availability:', available);
      if (available) {
        requestNotificationPermission();
        processExternalUserIdQueue();
        setTimeout(sendPlayerIdToIframe, INITIAL_PLAYER_ID_DELAY_MS);
      }
    }
  }, 500);
}

function bootstrapWrapper() {
  console.log('[Wrapper] Bootstrap start. Capacitor present?', !!window.Capacitor);
  adoptOrRegisterPlugin();
  startPluginProbes();
}

// If Capacitor already injected, start immediately; else wait briefly
if (window.Capacitor) {
  bootstrapWrapper();
} else {
  setTimeout(() => {
    if (window.Capacitor) {
      bootstrapWrapper();
    } else {
      console.warn('[Wrapper] Capacitor still missing after wait; continuing probes anyway.');
      startPluginProbes();
    }
  }, 300);
}

// Optional capacitorReady event (if emitted)
window.addEventListener('capacitorReady', () => {
  console.log('[Wrapper] capacitorReady event fired');
  bootstrapWrapper();
});

// Browser fallback notice
if (!window.Capacitor) {
  console.log('[Wrapper] Running in browser mode – native plugin features unavailable.');
}