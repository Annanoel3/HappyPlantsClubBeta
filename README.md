# HappyPlantsClubBeta

A mobile application wrapper for Happy Plants Club using Capacitor 7, with integrated OneSignal push notifications and custom plugin for external user ID linking.

## 🚀 Getting Started - Download This Project to Your Computer

**If you can't find the HappyPlantsClubBeta folder on your computer, you need to download it first!**

### What is "Cloning"?
Cloning means downloading a copy of this project from GitHub to your computer. There are two ways to do this:

---

## Method 1: Download as ZIP (Easiest - No Installation Required)

### Step 1: Download the ZIP file
1. Go to: https://github.com/Annanoel3/HappyPlantsClubBeta
2. Click the green **"Code"** button
3. Click **"Download ZIP"**
4. Save the file to your computer (e.g., Downloads folder)

### Step 2: Extract (Unzip) the File
- **Windows**: 
  - Right-click the downloaded `HappyPlantsClubBeta-main.zip` file
  - Select "Extract All..."
  - Choose where to extract (e.g., `C:\Users\YourName\Documents\Projects`)
  - Click "Extract"
  
- **macOS**: 
  - Double-click the `HappyPlantsClubBeta-main.zip` file
  - It will automatically extract to the same folder
  - Move the extracted folder to where you want it (e.g., `Documents/Projects`)
  
- **Linux**: 
  - Right-click the ZIP file and select "Extract Here"
  - Or use terminal: `unzip HappyPlantsClubBeta-main.zip`

### Step 3: Find Your Project
The extracted folder will be called `HappyPlantsClubBeta-main`. You can rename it to `HappyPlantsClubBeta` if you prefer.

### Step 4: Test the App
1. Open the folder `HappyPlantsClubBeta-main` (or `HappyPlantsClubBeta`)
2. Go inside the `www` folder
3. Double-click `index.html`
4. Your web browser will open showing the Happy Plants Club app!

---

## Method 2: Clone with Git (Recommended for Development)

This method requires Git to be installed, but it's better if you plan to make changes or updates.

### Step 1: Install Git (if you don't have it)

**Windows:**
1. Download Git from: https://git-scm.com/download/win
2. Run the installer
3. Use all default settings (just keep clicking "Next")
4. Restart your computer after installation

**macOS:**
1. Open Terminal (press `Cmd + Space`, type "terminal", press Enter)
2. Type: `git --version`
3. If Git isn't installed, macOS will prompt you to install it - click "Install"

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install git

# Fedora
sudo dnf install git
```

### Step 2: Open Terminal/Command Prompt
- **Windows**: Press `Win + R`, type `cmd`, press Enter
- **macOS**: Press `Cmd + Space`, type `terminal`, press Enter
- **Linux**: Press `Ctrl + Alt + T`

### Step 3: Navigate to Where You Want the Project
```bash
# Windows example (replace YourName with your actual username):
cd C:\Users\YourName\Documents

# macOS/Linux example:
cd ~/Documents
```

### Step 4: Clone the Project
Copy and paste this command:
```bash
git clone https://github.com/Annanoel3/HappyPlantsClubBeta.git
```

Press Enter and wait for it to download (should take 10-30 seconds).

### Step 5: Open the Project Folder
```bash
cd HappyPlantsClubBeta
```

### Step 6: Find Your Project
Your project is now at:
- **Windows**: `C:\Users\YourName\Documents\HappyPlantsClubBeta`
- **macOS/Linux**: `~/Documents/HappyPlantsClubBeta`

### Step 7: Install Dependencies
```bash
npm install
```

This will install Capacitor and all other required dependencies. Wait for the installation to complete (may take 1-2 minutes).

### Step 8: Test the App in Your Browser
```bash
# Windows:
start www\index.html

# macOS:
open www/index.html

# Linux:
xdg-open www/index.html
```

Or navigate to the `HappyPlantsClubBeta/www` folder and double-click `index.html`.

---

## 📍 Can't Find the Folder?

If you downloaded the project but can't find it:

1. **Search your computer:**
   - **Windows**: Press `Win`, type `HappyPlantsClubBeta`, press Enter
   - **macOS**: Press `Cmd + Space`, type `HappyPlantsClubBeta`, press Enter
   - **Linux**: Use your file manager's search function

2. **Check common locations:**
   - Downloads folder
   - Documents folder
   - Desktop

3. **For Git clone**: The folder is created in whatever directory you were in when you ran `git clone`

---

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
- **App ID**: `com.happyplantsclub.android`
- **App Name**: Happy Plants Club
- **Web URL**: https://happyplantsclub.base44.app

### Firebase
- ✅ **Firebase configured** - The production Firebase configuration file (`android/app/google-services.json`) is already included in the repository for the Happy Plants Club project.

See [ONESIGNAL_SETUP.md](ONESIGNAL_SETUP.md) for complete OneSignal setup instructions.

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

## Quick Start - Local Testing

To quickly test the app in your browser on your laptop:

1. Clone and navigate to the repository:
```bash
git clone https://github.com/Annanoel3/HappyPlantsClubBeta.git
cd HappyPlantsClubBeta
```

2. Install dependencies (including Capacitor):
```bash
npm install
```

3. Open `www/index.html` directly in your web browser:
   - **macOS**: `open www/index.html`
   - **Windows**: `start www/index.html`
   - **Linux**: `xdg-open www/index.html`
   - Or simply navigate to the `www` folder and double-click `index.html`

This will load the Happy Plants Club web app in an iframe with Capacitor integration. Note that some native features (like OneSignal) won't work in a browser, but you can test the basic functionality.

## Installation (For Mobile Development)

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
# or use the npm script:
npm run open:android
```

2. Build and run from Android Studio, or use the command line:
```bash
npx cap run android
# or use the npm script:
npm run dev:android
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
# or use the npm script:
npm run open:ios
```

3. Build and run from Xcode, or use the command line:
```bash
npx cap run ios
# or use the npm script:
npm run dev:ios
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
├── www/                  # Web assets (use this for local testing!)
│   ├── index.html        # Main app file with Capacitor integration
│   └── js/
│       ├── app.js        # OneSignal and iframe communication logic
│       └── capacitor.js  # Capacitor stub for browser testing
├── capacitor.config.json # Capacitor configuration
├── package.json          # Node.js dependencies
└── index.html            # Simplified wrapper (www/index.html is the main file)
```

**Important:** 
- For **local testing in browser**: Open `www/index.html`
- For **mobile development**: The `www/` folder is synced to native projects automatically
- The root `index.html` is a simplified version; the full app with Capacitor is in `www/index.html`

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
