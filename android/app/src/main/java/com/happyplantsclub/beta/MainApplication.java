package com.happyplantsclub.beta;

import android.app.Application;
import com.onesignal.OneSignal;
import com.onesignal.debug.LogLevel;

public class MainApplication extends Application {
    
    // OneSignal App ID
    private static final String ONESIGNAL_APP_ID = "3f0b6a12-b2d3-4c56-8e76-de9baafc41de";
    
    @Override
    public void onCreate() {
        super.onCreate();

        // Enable verbose logging for debug builds
        if (BuildConfig.DEBUG) {
            OneSignal.getDebug().setLogLevel(LogLevel.VERBOSE);
        }

        // OneSignal Initialization
        OneSignal.initWithContext(this, ONESIGNAL_APP_ID);
    }
}
