package com.happyplantsclub.android;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import android.util.Log;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d(TAG, "Registering NotifyBridge plugin...");
        registerPlugin(NotifyBridge.class);  // BEFORE super.onCreate()
        super.onCreate(savedInstanceState);
    }
}