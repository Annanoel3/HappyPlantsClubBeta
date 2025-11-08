package com.happyplantsclub.android;

import android.app.Application;
import android.util.Log;

import com.onesignal.OneSignal;
import com.onesignal.debug.LogLevel;

public class MainApplication extends Application {
    private static final String TAG = "MainApplication";
    private static final String ONESIGNAL_APP_ID = "3f0b6a12-b2d3-4c56-8e76-de9baafc41de";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "onCreate: initializing OneSignal");
        boolean isDebug = !"user".equals(android.os.Build.TYPE);
        if (isDebug) {
            OneSignal.getDebug().setLogLevel(LogLevel.VERBOSE);
        }
        OneSignal.initWithContext(this, ONESIGNAL_APP_ID);
        Log.d(TAG, "OneSignal init complete");
    }
}