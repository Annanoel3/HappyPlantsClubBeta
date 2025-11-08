package com.happyplantsclub.android;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

// Add these imports for the permission fallback
import com.onesignal.OneSignal;
import kotlin.coroutines.Continuation;
import kotlin.coroutines.CoroutineContext;
import kotlin.coroutines.EmptyCoroutineContext;
import org.jetbrains.annotations.NotNull;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d(TAG, "onCreate start");
        // IMPORTANT: super.onCreate BEFORE registerPlugin so the bridge is initialized
        super.onCreate(savedInstanceState);

        Log.d(TAG, "Registering NotifyBridge plugin...");
        registerPlugin(NotifyBridge.class);
        Log.d(TAG, "NotifyBridge plugin registered");

        // Fallback: request Android 13+ notification permission from native side
        // This guarantees the prompt on first launch even if JS init is delayed
        try {
            OneSignal.getNotifications().requestPermission(true, new Continuation<Boolean>() {
                @NotNull
                @Override
                public CoroutineContext getContext() {
                    return EmptyCoroutineContext.INSTANCE;
                }
                @Override
                public void resumeWith(@NotNull Object result) {
                    Log.d(TAG, "OneSignal POST_NOTIFICATIONS permission flow completed");
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "OneSignal permission request failed: " + e.getMessage());
        }
    }
}