# OneSignal Integration Setup Guide

This document provides detailed instructions for completing the OneSignal integration in the Happy Plants Club mobile app.

## Overview

The app is configured with:
- **Capacitor 7** mobile wrapper
- **OneSignal SDK 5.x** for push notifications
- **Custom NotifyBridge plugin** for web app ↔ native communication
- **External User ID linking** (e.g., user email → OneSignal Player ID)

## Architecture

```
┌─────────────────────────────┐
│   Base44 Web App            │
│  (happyplantsclub.base44.app)│
└──────────┬──────────────────┘
           │ postMessage
           ↓
┌─────────────────────────────┐
│  app.js (Wrapper/JS)        │
│  - Handles postMessage       │
│  - Calls NotifyBridge plugin │
└──────────┬──────────────────┘
           │ Capacitor Plugin API
           ↓
┌─────────────────────────────┐
│  NotifyBridge (Java Plugin) │
│  - login(externalId)         │
│  - getPlayerId()             │
│  - logout()                  │
│  - requestPermission()       │
└──────────┬──────────────────┘
           │ OneSignal SDK
           ↓
┌─────────────────────────────┐
│  OneSignal Native SDK       │
│  - Push notifications        │
│  - Player ID management      │
└─────────────────────────────┘
```

## Required Setup Steps

### 1. Firebase Configuration (REQUIRED for Android Push Notifications)

OneSignal requires Firebase Cloud Messaging (FCM) for Android push notifications.

#### Steps:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Click "Add app" → Select Android
4. Enter package name: `com.happyplantsclub.beta`
5. Download the `google-services.json` file
6. Replace the placeholder file at:
   ```
   android/app/google-services.json
   ```

#### OneSignal Dashboard Configuration:

1. Go to [OneSignal Dashboard](https://dashboard.onesignal.com/)
2. Select your app: `3f0b6a12-b2d3-4c56-8e76-de9baafc41de`
3. Navigate to Settings → Platforms → Google Android (FCM)
4. Upload your Firebase Server Key or configure OAuth

### 2. iOS Push Notification Configuration (REQUIRED for iOS)

1. **Apple Developer Account Setup:**
   - Create an App ID: `com.happyplantsclub.beta`
   - Enable Push Notifications capability
   - Generate APNs Authentication Key or Certificate

2. **OneSignal Dashboard:**
   - Go to Settings → Platforms → Apple iOS (APNs)
   - Upload your .p12 certificate or .p8 authentication key

3. **Xcode Configuration:**
   - Open the iOS project: `npx cap open ios`
   - Select the target → Signing & Capabilities
   - Add Push Notifications capability
   - Configure your Team and Bundle Identifier

### 3. Build and Run

#### Android:

```bash
# Sync Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android

# Or build from command line
cd android
./gradlew assembleDebug
```

#### iOS:

```bash
# Install CocoaPods dependencies
cd ios/App
pod install
cd ../..

# Sync Capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios
```

## Testing the Integration

### 1. Verify Plugin Registration (Android)

Use `adb logcat` to verify the plugin loads:

```bash
adb logcat | grep -E "(MainActivity|NotifyBridge|OneSignal)"
```

Expected logs:
```
MainActivity: Registering NotifyBridge plugin...
MainActivity: NotifyBridge plugin registered
MainActivity: MainActivity onCreate completed
NotifyBridge: NotifyBridge plugin loaded successfully!
```

### 2. Test in Chrome DevTools

1. Connect your Android device via USB
2. Open Chrome and navigate to `chrome://inspect`
3. Select your app
4. In the console, verify the plugin is available:

```javascript
// Check available plugins
console.log(Object.keys(window.Capacitor.Plugins));
// Should include: ['NotifyBridge', ...]

// Check NotifyBridge methods
console.log(window.Capacitor.Plugins.NotifyBridge);
// Should show: { login: ƒ, getPlayerId: ƒ, logout: ƒ, requestPermission: ƒ }

// Test getting Player ID
await window.Capacitor.Plugins.NotifyBridge.getPlayerId();
// Returns: { playerId: "..." }
```

### 3. Test External User ID Linking

From your Base44 web app, send a message when a user logs in:

```javascript
// In your web app's login success handler
function onUserAuthenticated(userEmail) {
    console.log('[OneSignal] Setting external user ID:', userEmail);
    
    // Send message to Capacitor wrapper
    if (window !== window.parent) {
        window.parent.postMessage({
            type: 'setOneSignalExternalUserId',
            externalUserId: userEmail
        }, '*');
    }
}

// Listen for confirmation
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'oneSignalExternalUserIdSet') {
        if (event.data.success) {
            console.log('[OneSignal] Player ID linked:', event.data.playerId);
        } else {
            console.error('[OneSignal] Failed to link:', event.data.error);
        }
    }
});
```

### 4. Verify in OneSignal Dashboard

1. Open [OneSignal Dashboard](https://dashboard.onesignal.com/)
2. Go to Audience → All Users
3. Find your device by Player ID
4. Verify the "External User ID" field shows the user's email

## NotifyBridge Plugin API

### Methods

#### `login(options: { externalId: string })`

Links a user's external ID (email, username, etc.) to their OneSignal Player ID.

```javascript
const result = await NotifyBridge.login({ 
    externalId: 'user@example.com' 
});
// Returns: { playerId: "...", externalId: "user@example.com" }
```

#### `getPlayerId()`

Retrieves the current OneSignal Player ID.

```javascript
const result = await NotifyBridge.getPlayerId();
// Returns: { playerId: "..." }
```

#### `logout()`

Logs out the current user from OneSignal (clears external user ID).

```javascript
await NotifyBridge.logout();
```

#### `requestPermission()`

Requests push notification permission (Android 13+).

```javascript
await NotifyBridge.requestPermission();
```

## Permissions

### Android (AndroidManifest.xml)

Already configured:
- ✅ `POST_NOTIFICATIONS` - Push notifications (Android 13+)
- ✅ `VIBRATE` - Notification vibration
- ✅ `RECEIVE_BOOT_COMPLETED` - Notification persistence
- ✅ `WAKE_LOCK` - Background notifications
- ✅ `RECORD_AUDIO` - Microphone access
- ✅ `MODIFY_AUDIO_SETTINGS` - Audio settings

### iOS (Info.plist)

Already configured:
- ✅ `UIBackgroundModes` → `remote-notification`
- ✅ `NSMicrophoneUsageDescription`
- ✅ `NSCameraUsageDescription`

## Files Modified/Created

### Android:
- ✅ `android/app/src/main/java/.../MainActivity.java` - Plugin registration
- ✅ `android/app/src/main/java/.../MainApplication.java` - OneSignal init
- ✅ `android/app/src/main/java/.../NotifyBridge.java` - Custom plugin
- ✅ `android/app/src/main/AndroidManifest.xml` - Permissions
- ⚠️ `android/app/google-services.json` - **NEEDS REPLACEMENT**

### iOS:
- ✅ `ios/App/App/AppDelegate.swift` - OneSignal init
- ✅ `ios/App/App/Info.plist` - Permissions

### Web Assets:
- ✅ `www/index.html` - Main wrapper HTML
- ✅ `www/js/app.js` - JavaScript bridge logic
- ✅ `www/js/capacitor.js` - Capacitor stub

### Configuration:
- ✅ `capacitor.config.json` - Capacitor configuration
- ✅ `package.json` - Dependencies

**Note:** The `cleartext: true` setting in `capacitor.config.json` is enabled to support HTTP traffic during development. For production builds, ensure your server uses HTTPS (which happyplantsclub.base44.app already does), or remove this setting to enforce secure connections only.

## Troubleshooting

### Issue: "NotifyBridge plugin not available"

**Solution:** Ensure plugin is registered BEFORE `super.onCreate()` in MainActivity.java (already done).

### Issue: Build error about google-services.json

**Solution:** Replace the placeholder `android/app/google-services.json` with your actual Firebase configuration file.

### Issue: Push notifications not working on Android

**Solutions:**
1. Verify `google-services.json` is correct
2. Verify Firebase Server Key is configured in OneSignal dashboard
3. Check device has Google Play Services installed
4. Verify app has notification permission granted

### Issue: Push notifications not working on iOS

**Solutions:**
1. Verify APNs certificate/key is configured in OneSignal
2. Verify Bundle ID matches in Xcode and OneSignal
3. Verify Push Notifications capability is enabled in Xcode
4. Test on a physical device (push won't work in simulator)

### Issue: Plugin loads but methods don't work

**Solution:** Check `adb logcat` or Xcode console for error messages from NotifyBridge or OneSignal SDK.

## Next Steps

1. ✅ Code is ready and committed
2. ⚠️ Replace `android/app/google-services.json` with real Firebase config
3. ⚠️ Configure APNs in OneSignal dashboard for iOS
4. ⚠️ Test on physical devices
5. ⚠️ Implement web app integration (postMessage communication)

## Support Resources

- [OneSignal Documentation](https://documentation.onesignal.com/)
- [Capacitor Plugin Guide](https://capacitorjs.com/docs/plugins)
- [Firebase Console](https://console.firebase.google.com/)
- [OneSignal Dashboard](https://dashboard.onesignal.com/)

---

**App ID:** `com.happyplantsclub.beta`  
**OneSignal App ID:** `3f0b6a12-b2d3-4c56-8e76-de9baafc41de`  
**Web URL:** `https://happyplantsclub.base44.app`
