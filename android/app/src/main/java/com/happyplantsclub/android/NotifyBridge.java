package com.happyplantsclub.android;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;
import com.onesignal.OneSignal;
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
    @PluginMethod
    public void login(PluginCall call) {
        String externalId = call.getString("externalId");

        if (externalId == null || externalId.isEmpty()) {
            call.reject("External ID is required");
            return;
        }

        try {
            // Call the native OneSignal SDK login method
            // This associates the user's email with their OneSignal player ID
            OneSignal.login(externalId);

            // Get the Player ID (OneSignal User ID) and return it
            String playerId = getPlayerIdFromOneSignal();
            
            JSObject result = new JSObject();
            result.put("playerId", playerId);
            result.put("externalId", externalId);
            
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to set external user ID: " + e.getMessage());
        }
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
        try {
            String playerId = getPlayerIdFromOneSignal();
            
            JSObject result = new JSObject();
            result.put("playerId", playerId);
            
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get Player ID: " + e.getMessage());
        }
    }

    /**
     * Helper method to get the Player ID from OneSignal
     *
     * @return The OneSignal Player ID (OneSignal User ID)
     */
    private String getPlayerIdFromOneSignal() {
        // Get the OneSignal User ID (also known as Player ID)
        String onesignalId = OneSignal.getUser().getOnesignalId();
        
        // If OneSignal ID is not available, try to get the push subscription ID
        if (onesignalId == null || onesignalId.isEmpty()) {
            IPushSubscription pushSubscription = OneSignal.getUser().getPushSubscription();
            if (pushSubscription != null) {
                onesignalId = pushSubscription.getId();
            }
        }
        
        return onesignalId != null ? onesignalId : "";
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
        try {
            // Remove the external user ID association
            OneSignal.logout();

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to logout: " + e.getMessage());
        }
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
    }
}