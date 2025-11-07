# HappyPlantsClubBeta

A mobile application wrapper for Happy Plants Club using Capacitor 7, with integrated OneSignal push notifications.

## Overview

This project wraps the Happy Plants Club web application (https://happyplantsclub.base44.app) in a native mobile app container using Capacitor 7. It includes:

- ✅ Capacitor 7 integration
- ✅ OneSignal push notifications
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
