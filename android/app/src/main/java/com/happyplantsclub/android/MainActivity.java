package com.happyplantsclub.android;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

import com.onesignal.OneSignal;
import kotlin.coroutines.Continuation;
import kotlin.coroutines.CoroutineContext;
import kotlin.coroutines.EmptyCoroutineContext;
import org.jetbrains.annotations.NotNull;

import androidx.core.content.ContextCompat;
import androidx.core.app.ActivityCompat;
import android.content.pm.PackageManager;
import android.Manifest;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static final int NOTIF_REQ_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d(TAG, "onCreate start");
        super.onCreate(savedInstanceState);

        Log.d(TAG, "Registering NotifyBridge plugin...");
        registerPlugin(NotifyBridge.class);
        Log.d(TAG, "NotifyBridge plugin registered");

        // Verify OneSignal user object existence
        if (OneSignal.getUser() == null) {
            Log.w(TAG, "OneSignal user is null at Activity onCreate (initialization may still be in progress)");
        } else {
            Log.d(TAG, "OneSignal user object already available");
        }

        requestNotificationPermissionManually();
        requestNotificationPermissionViaOneSignal();
    }

    private void requestNotificationPermissionManually() {
        if (android.os.Build.VERSION.SDK_INT < 33) {
            Log.d(TAG, "POST_NOTIFICATIONS not needed (API < 33)");
            return;
        }
        int status = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS);
        if (status == PackageManager.PERMISSION_GRANTED) {
            Log.d(TAG, "POST_NOTIFICATIONS already granted (manual check)");
        } else {
            Log.d(TAG, "Requesting POST_NOTIFICATIONS via ActivityCompat.requestPermissions");
            ActivityCompat.requestPermissions(
                this,
                new String[]{Manifest.permission.POST_NOTIFICATIONS},
                NOTIF_REQ_CODE
            );
        }
    }

    private void requestNotificationPermissionViaOneSignal() {
        try {
            OneSignal.getNotifications().requestPermission(true, new Continuation<Boolean>() {
                @NotNull
                @Override
                public CoroutineContext getContext() {
                    return EmptyCoroutineContext.INSTANCE;
                }
                @Override
                public void resumeWith(@NotNull Object result) {
                    Log.d(TAG, "OneSignal permission helper resumed; result=" + result);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "OneSignal permission helper failed: " + e.getMessage());
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NOTIF_REQ_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "User granted POST_NOTIFICATIONS via manual request");
            } else {
                Log.w(TAG, "User denied POST_NOTIFICATIONS via manual request");
            }
        }
    }
}