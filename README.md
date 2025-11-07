# HappyPlantsClubBeta

A mobile application wrapper for Happy Plants Club using Capacitor 7, with integrated OneSignal push notifications and custom plugin for external user ID linking.

## Overview

This project wraps the Happy Plants Club web application (https://happyplantsclub.base44.app) in a native mobile app container using Capacitor 7. It includes:

- ✅ Capacitor 7 integration
- ✅ OneSignal push notifications (SDK 5.x)
- ✅ Custom NotifyBridge plugin for web ↔ native communication
- ✅ External user ID linking (email → OneSignal Player ID)
- ✅ Push notification permissions
- ✅ Microphone permissions
- ✅ Android and iOS platform support

## Configuration

### OneSignal
- **App ID**: `3f0b6a12-b2d3-4c56-8e76-de9baafc41de`

### Capacitor
- **App ID**: `com.happyplantsclub.beta`
- **App Name**: Happy Plants Club
- **Web URL**: https://happyplantsclub.base44.app

## Important: Firebase Setup Required

⚠️ **Before building for Android**, you must replace the placeholder `android/app/google-services.json` file with your actual Firebase configuration file.

See [ONESIGNAL_SETUP.md](ONESIGNAL_SETUP.md) for complete setup instructions.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- For Android development:
  - Android Studio
  - Java JDK 11 or higher
- For iOS development:
  - macOS
  - Xcode 14 or higher
  - CocoaPods

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Annanoel3/HappyPlantsClubBeta.git
cd HappyPlantsClubBeta
```

2. Install dependencies:
```bash
npm install
```

3. Sync Capacitor:
```bash
npm run sync
```

## Building

### Android

1. Open Android project in Android Studio:
```bash
npx cap open android
```

2. Build and run from Android Studio, or use the command line:
```bash
npx cap run android
```

### iOS

1. Install iOS dependencies:
```bash
cd ios/App
pod install
cd ../..
```

2. Open iOS project in Xcode:
```bash
npx cap open ios
```

3. Build and run from Xcode, or use the command line:
```bash
npx cap run ios
```

## Permissions

### Android
The app requests the following permissions:
- `POST_NOTIFICATIONS` - For push notifications
- `RECORD_AUDIO` - For microphone access
- `MODIFY_AUDIO_SETTINGS` - For audio settings
- `WAKE_LOCK` - For background notifications
- `RECEIVE_BOOT_COMPLETED` - For notification delivery after device restart
- `VIBRATE` - For notification vibration

### iOS
The app includes usage descriptions for:
- Microphone access (`NSMicrophoneUsageDescription`)
- Camera access (`NSCameraUsageDescription`)
- Background modes for remote notifications

## Project Structure

```
HappyPlantsClubBeta/
├── android/              # Android native project
├── ios/                  # iOS native project
├── www/                  # Web assets
├── capacitor.config.json # Capacitor configuration
├── package.json          # Node.js dependencies
└── index.html           # Main HTML file (iframe wrapper)
```

## Development

The app loads the web application via an iframe with the following permissions enabled:
- Microphone
- Camera
- Geolocation

### NotifyBridge Plugin API

The custom NotifyBridge plugin enables communication between your web app and the native OneSignal SDK:

#### Methods

**`login(options: { externalId: string })`** - Links an external user ID to OneSignal Player ID
```javascript
await NotifyBridge.login({ externalId: 'user@example.com' });
```

**`getPlayerId()`** - Retrieves the current OneSignal Player ID
```javascript
const result = await NotifyBridge.getPlayerId();
```

**`logout()`** - Clears the external user ID
```javascript
await NotifyBridge.logout();
```

**`requestPermission()`** - Requests push notification permission
```javascript
await NotifyBridge.requestPermission();
```

### Web App Integration

From your Base44 web app, communicate with the mobile wrapper using postMessage:

```javascript
// Set external user ID when user logs in
window.parent.postMessage({
    type: 'setOneSignalExternalUserId',
    externalUserId: 'user@example.com'
}, '*');

// Listen for confirmation
window.addEventListener('message', function(event) {
    if (event.data?.type === 'oneSignalExternalUserIdSet') {
        console.log('OneSignal linked:', event.data.playerId);
    }
});
```

## Sync Changes

After making changes to web assets or configuration:
```bash
npm run sync
```

## Troubleshooting

### Android Build Issues
- Ensure Android SDK is properly installed
- Check that ANDROID_HOME environment variable is set
- Run `./gradlew clean` in the android directory

### iOS Build Issues
- Run `pod install` in the ios/App directory
- Ensure Xcode Command Line Tools are installed
- Clean build folder in Xcode (Shift + Cmd + K)

### OneSignal Issues
- Verify the OneSignal App ID is correct
- Check that push notification certificates are properly configured in OneSignal dashboard
- For iOS, ensure you have a valid push notification certificate or APNs authentication key

## License

ISC
