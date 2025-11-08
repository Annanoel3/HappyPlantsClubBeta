package com.happyplantsclub.android;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

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
    }
}