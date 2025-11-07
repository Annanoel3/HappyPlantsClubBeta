package com.happyplantsclub.android;

import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.onesignal.OneSignal;
import com.onesignal.user.OSUser;
import com.onesignal.user.subscriptions.IPushSubscription;
import kotlin.coroutines.Continuation;
import kotlin.coroutines.CoroutineContext;
import kotlin.coroutines.EmptyCoroutineContext;
import org.jetbrains.annotations.NotNull;
/**
 * NotifyBridge - Custom Capacitor plugin to bridge web app with OneSignal native SDK
 *
 * This plugin provides a bridge between your Base44 web app and the native OneSignal Android SDK.
 * It allows the web app to call OneSignal.login() to set the external user ID.
 */
@CapacitorPlugin(name = "NotifyBridge")
public class NotifyBridge extends Plugin {

    /**
     * Login method - Sets the external user ID in OneSignal and returns the Player ID
     *
     * This is called from the web app via window.Capacitor.Plugins.NotifyBridge.login({externalId: email})
     *
     * @param call PluginCall containing the externalId parameter
     */
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
                // Call the native OneSignal SDK login method
                // This associates the user's email with their OneSignal player ID
                OneSignal.login(externalId);
                resolvePlayerIdOnMainThread(call, externalId, 0);
            } catch (Exception e) {
                call.reject("Failed to set external user ID: " + e.getMessage());
            }
        });
    }

    /**
     * Get Player ID method - Retrieves the OneSignal Player ID (OneSignal User ID)
     *
     * This is called from the web app via window.Capacitor.Plugins.NotifyBridge.getPlayerId()
     *
     * @param call PluginCall
     */
    @PluginMethod
    public void getPlayerId(PluginCall call) {
        resolvePlayerIdAsync(call, null, 0);
    }

    /**
     * Helper method to get the Player ID from OneSignal
     *
     * @return The OneSignal Player ID (OneSignal User ID)
     */
    private String getPlayerIdFromOneSignal() {
        OSUser user = OneSignal.getUser();

        if (user == null) {
            return "";
        }

        // Get the OneSignal User ID (also known as Player ID)
        String onesignalId = user.getOnesignalId();

        // If OneSignal ID is not available, try to get the push subscription ID
        if (onesignalId == null || onesignalId.isEmpty()) {
            IPushSubscription pushSubscription = user.getPushSubscription();
            if (pushSubscription != null) {
                onesignalId = pushSubscription.getId();
            }
        }

        return onesignalId != null ? onesignalId : "";
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

            mainHandler.postDelayed(() -> resolvePlayerIdOnMainThread(call, externalId, attempt + 1), PLAYER_ID_RETRY_DELAY_MS);
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

    /**
     * Logout method - Removes the external user ID from OneSignal
     *
     * This should be called when the user logs out of your app
     *
     * @param call PluginCall
     */
    @PluginMethod
    public void logout(PluginCall call) {
        runOnMainThread(() -> {
            try {
                // Remove the external user ID association
                OneSignal.logout();

                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to logout: " + e.getMessage());
            }
        });
    }

    /**
     * Request notification permission
     *
     * This is required for Android 13+ to request POST_NOTIFICATIONS permission
     *
     * @param call PluginCall
     */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        runOnMainThread(() -> {
            try {
                // Request notification permission (required for Android 13+)
                // OneSignal SDK 5.x's requestPermission() is a Kotlin suspend function
                // Calling it from Java requires a Continuation callback parameter
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