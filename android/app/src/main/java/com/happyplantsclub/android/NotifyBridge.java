package com.happyplantsclub.android;

import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.onesignal.OneSignal;
import com.onesignal.user.subscriptions.IPushSubscription;
import kotlin.coroutines.Continuation;
import kotlin.coroutines.CoroutineContext;
import kotlin.coroutines.EmptyCoroutineContext;
import org.jetbrains.annotations.NotNull;

/**
 * NotifyBridge - Custom Capacitor plugin to bridge web app with OneSignal native SDK
 */
@CapacitorPlugin(name = "NotifyBridge")
public class NotifyBridge extends Plugin {

    private static final int PLAYER_ID_MAX_ATTEMPTS = 10;
    private static final long PLAYER_ID_RETRY_DELAY_MS = 500L;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void login(PluginCall call) {
        String externalId = call.getString("externalId");
        if (externalId == null || externalId.isEmpty()) {
            call.reject("External ID is required");
            return;
        }
        runOnMainThread(() -> {
            try {
                OneSignal.login(externalId);
                // small defer to allow SDK to populate IDs before first check
                mainHandler.postDelayed(() -> resolvePlayerIdOnMainThread(call, externalId, 0), 200);
            } catch (Exception e) {
                call.reject("Failed to set external user ID: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void getPlayerId(PluginCall call) {
        resolvePlayerIdAsync(call, null, 0);
    }

    private String getPlayerIdFromOneSignal() {
        try {
            if (OneSignal.getUser() == null) {
                return "";
            }
            String onesignalId = OneSignal.getUser().getOnesignalId();
            if (onesignalId != null && !onesignalId.isEmpty()) {
                return onesignalId;
            }
            IPushSubscription pushSubscription = OneSignal.getUser().getPushSubscription();
            if (pushSubscription != null) {
                String subId = pushSubscription.getId();
                if (subId != null && !subId.isEmpty()) {
                    return subId;
                }
            }
        } catch (Exception ignored) {}
        return "";
    }

    private void resolvePlayerIdAsync(final PluginCall call, final String externalId, final int attempt) {
        runOnMainThread(() -> resolvePlayerIdOnMainThread(call, externalId, attempt));
    }

    private void resolvePlayerIdOnMainThread(final PluginCall call, final String externalId, final int attempt) {
        try {
            String playerId = getPlayerIdFromOneSignal();
            if (playerId != null && !playerId.isEmpty()) {
                JSObject result = new JSObject();
                result.put("playerId", playerId);
                if (externalId != null) {
                    result.put("externalId", externalId);
                }
                call.resolve(result);
                return;
            }
            if (attempt >= PLAYER_ID_MAX_ATTEMPTS) {
                call.reject("Player ID not available after waiting for OneSignal to initialize");
                return;
            }
            mainHandler.postDelayed(
                () -> resolvePlayerIdOnMainThread(call, externalId, attempt + 1),
                PLAYER_ID_RETRY_DELAY_MS
            );
        } catch (Exception e) {
            call.reject("Failed to retrieve Player ID: " + e.getMessage());
        }
    }

    private void runOnMainThread(Runnable runnable) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            runnable.run();
        } else {
            mainHandler.post(runnable);
        }
    }

    @PluginMethod
    public void logout(PluginCall call) {
        runOnMainThread(() -> {
            try {
                OneSignal.logout();
                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to logout: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        runOnMainThread(() -> {
            try {
                OneSignal.getNotifications().requestPermission(true, new Continuation<Boolean>() {
                    @NotNull
                    @Override
                    public CoroutineContext getContext() {
                        return EmptyCoroutineContext.INSTANCE;
                    }
                    @Override
                    public void resumeWith(@NotNull Object result) {
                        call.resolve();
                    }
                });
            } catch (Exception e) {
                call.reject("Failed to request permission: " + e.getMessage());
            }
        });
    }
}