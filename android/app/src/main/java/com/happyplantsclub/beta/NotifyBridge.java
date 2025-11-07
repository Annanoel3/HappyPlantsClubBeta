package com.happyplantsclub.beta;

import android.util.Log;
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

@CapacitorPlugin(name = "NotifyBridge")
public class NotifyBridge extends Plugin {

    private static final String TAG = "NotifyBridge";
    
    @Override
    public void load() {
        Log.d(TAG, "NotifyBridge plugin loaded successfully!");
        super.load();
    }

    /**
     * Login method - Sets the external user ID in OneSignal
     */
    @PluginMethod
    public void login(PluginCall call) {
        Log.d(TAG, "login() method called");
        String externalId = call.getString("externalId");

        if (externalId == null || externalId.isEmpty()) {
            call.reject("External ID is required");
            return;
        }

        try {
            // Associate the user's email/ID with their OneSignal player ID
            OneSignal.login(externalId);

            // Get the Player ID and return it
            String playerId = getPlayerIdFromOneSignal();
            
            JSObject result = new JSObject();
            result.put("playerId", playerId);
            result.put("externalId", externalId);
            
            Log.d(TAG, "External user ID set: " + externalId + ", Player ID: " + playerId);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to set external user ID: " + e.getMessage());
            call.reject("Failed to set external user ID: " + e.getMessage());
        }
    }

    /**
     * Get Player ID method
     */
    @PluginMethod
    public void getPlayerId(PluginCall call) {
        try {
            String playerId = getPlayerIdFromOneSignal();
            
            JSObject result = new JSObject();
            result.put("playerId", playerId);
            
            Log.d(TAG, "Player ID retrieved: " + playerId);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to get Player ID: " + e.getMessage());
            call.reject("Failed to get Player ID: " + e.getMessage());
        }
    }

    /**
     * Helper to get Player ID from OneSignal
     */
    private String getPlayerIdFromOneSignal() {
        String onesignalId = OneSignal.getUser().getOnesignalId();
        
        if (onesignalId == null || onesignalId.isEmpty()) {
            IPushSubscription pushSubscription = OneSignal.getUser().getPushSubscription();
            if (pushSubscription != null) {
                onesignalId = pushSubscription.getId();
            }
        }
        
        return onesignalId != null ? onesignalId : "";
    }

    /**
     * Logout method
     */
    @PluginMethod
    public void logout(PluginCall call) {
        try {
            OneSignal.logout();
            Log.d(TAG, "User logged out from OneSignal");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to logout: " + e.getMessage());
            call.reject("Failed to logout: " + e.getMessage());
        }
    }

    /**
     * Request notification permission (Android 13+)
     */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        try {
            OneSignal.getNotifications().requestPermission(true, new Continuation<Boolean>() {
                @NotNull
                @Override
                public CoroutineContext getContext() {
                    return EmptyCoroutineContext.INSTANCE;
                }

                @Override
                public void resumeWith(@NotNull Object result) {
                    Log.d(TAG, "Permission request completed");
                    call.resolve();
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Failed to request permission: " + e.getMessage());
            call.reject("Failed to request permission: " + e.getMessage());
        }
    }
}
