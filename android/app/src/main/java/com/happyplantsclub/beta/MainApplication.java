package com.happyplantsclub.beta;

import android.app.Application;
import com.onesignal.OneSignal;

public class MainApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();

        // OneSignal Initialization
        OneSignal.initWithContext(this, "3f0b6a12-b2d3-4c56-8e76-de9baafc41de");

        // Request push notification permission
        OneSignal.getNotifications().requestPermission(true, null);
    }
}
