package com.happyplantsclub.android;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    private static final String TAG = "MainActivity";
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // ⚠️ IMPORTANT: Register plugin BEFORE super.onCreate()
        // This ensures it's available when Capacitor initializes
        Log.d(TAG, "Registering NotifyBridge plugin...");
        registerPlugin(NotifyBridge.class);
        Log.d(TAG, "NotifyBridge plugin registered");
        
        super.onCreate(savedInstanceState);
        Log.d(TAG, "MainActivity onCreate completed");
    }
}
