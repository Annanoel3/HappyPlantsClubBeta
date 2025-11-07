# Deployment Checklist

Use this checklist to deploy your Happy Plants Club mobile app to production.

## ✅ What's Already Done

- [x] Capacitor 7 project initialized
- [x] Android and iOS platforms added
- [x] OneSignal SDK integrated (v5.x)
- [x] Custom NotifyBridge plugin created
- [x] JavaScript bridge implemented
- [x] Permissions configured (push notifications, microphone)
- [x] Web app wrapper configured
- [x] Documentation created

## 🔧 Next Steps

### 1. Firebase Setup (Android) - REQUIRED

- [ ] Go to [Firebase Console](https://console.firebase.google.com/)
- [ ] Create a new project (or use existing)
- [ ] Click "Add app" → Select Android
- [ ] Enter package name: `com.happyplantsclub.android`
- [ ] Download `google-services.json`
- [ ] Replace file at: `android/app/google-services.json`
- [ ] In Firebase Console, go to Project Settings → Cloud Messaging
- [ ] Copy the Server Key
- [ ] Go to [OneSignal Dashboard](https://dashboard.onesignal.com/)
- [ ] Settings → Platforms → Google Android (FCM)
- [ ] Paste Server Key and save

### 2. Apple Developer Setup (iOS) - REQUIRED

- [ ] Enroll in Apple Developer Program (if not already)
- [ ] Go to [Apple Developer Portal](https://developer.apple.com/)
- [ ] Identifiers → App IDs → Create new
- [ ] Bundle ID: `com.happyplantsclub.android`
- [ ] Enable "Push Notifications" capability
- [ ] Keys → Create new key
- [ ] Enable "Apple Push Notifications service (APNs)"
- [ ] Download .p8 key file
- [ ] Go to [OneSignal Dashboard](https://dashboard.onesignal.com/)
- [ ] Settings → Platforms → Apple iOS (APNs)
- [ ] Upload .p8 key and enter Team ID and Key ID

### 3. Build Android App

- [ ] Open terminal in project root
- [ ] Run: `npx cap sync android`
- [ ] Run: `npx cap open android`
- [ ] In Android Studio:
  - [ ] Select Build → Clean Project
  - [ ] Select Build → Rebuild Project
  - [ ] Select Build → Generate Signed Bundle/APK
  - [ ] Follow the wizard to create a release build
- [ ] Test on a physical Android device (not emulator)

### 4. Build iOS App

- [ ] Open terminal in project root
- [ ] Run: `cd ios/App && pod install && cd ../..`
- [ ] Run: `npx cap sync ios`
- [ ] Run: `npx cap open ios`
- [ ] In Xcode:
  - [ ] Select the App target
  - [ ] Signing & Capabilities tab
  - [ ] Select your Team
  - [ ] Ensure Bundle Identifier is `com.happyplantsclub.android`
  - [ ] Add "Push Notifications" capability
  - [ ] Add "Background Modes" capability → Check "Remote notifications"
  - [ ] Select Product → Archive
  - [ ] Distribute to TestFlight or App Store
- [ ] Test on a physical iOS device (not simulator)

### 5. Test Push Notifications

- [ ] Install app on physical device
- [ ] Launch app and grant notification permission
- [ ] Check device logs for Player ID
- [ ] Go to [OneSignal Dashboard](https://dashboard.onesignal.com/)
- [ ] Audience → All Users
- [ ] Verify your device appears
- [ ] Send a test notification
- [ ] Verify notification is received

### 6. Test External User ID Linking

- [ ] Add postMessage code to your web app (see ONESIGNAL_SETUP.md)
- [ ] Log in to your web app within the mobile app
- [ ] Check device logs for "External user ID set" message
- [ ] Go to OneSignal Dashboard → All Users
- [ ] Find your device
- [ ] Verify "External User ID" field shows your email/user ID

### 7. Web App Integration

- [ ] Add the login integration code to your Base44 web app:

```javascript
// After successful login
function onUserAuthenticated(userEmail) {
    if (window !== window.parent) {
        window.parent.postMessage({
            type: 'setOneSignalExternalUserId',
            externalUserId: userEmail
        }, '*');
    }
}

// Listen for confirmation
window.addEventListener('message', function(event) {
    if (event.data?.type === 'oneSignalExternalUserIdSet') {
        if (event.data.success) {
            console.log('OneSignal linked to:', event.data.playerId);
            // Store or use the Player ID as needed
        }
    }
});
```

### 8. App Store Submission (Optional)

#### Google Play Store
- [ ] Create app listing in [Google Play Console](https://play.google.com/console)
- [ ] Upload AAB file
- [ ] Fill out app details, screenshots, descriptions
- [ ] Set up content rating
- [ ] Submit for review

#### Apple App Store
- [ ] Create app listing in [App Store Connect](https://appstoreconnect.apple.com/)
- [ ] Upload IPA via Xcode or Transporter
- [ ] Fill out app details, screenshots, descriptions
- [ ] Submit for review

### 9. Monitoring & Analytics

- [ ] Set up OneSignal segments for targeted notifications
- [ ] Monitor delivery rates in OneSignal Dashboard
- [ ] Track user engagement
- [ ] Set up A/B testing for push notifications (optional)

## 📝 Important Notes

### Security
- The `google-services.json` file contains public configuration data but should be kept private to prevent abuse
- Never commit your signing keys or certificates to version control
- Use environment-specific builds for dev/staging/production

### Testing Tips
- Always test push notifications on physical devices (not emulators/simulators)
- Test notification permissions on both Android 13+ and earlier versions
- Test on both iOS and Android to ensure cross-platform compatibility
- Verify deep links and notification actions work correctly

### Troubleshooting Resources
- See `ONESIGNAL_SETUP.md` for detailed troubleshooting
- Check logs with `adb logcat` (Android) or Xcode console (iOS)
- Visit [OneSignal Documentation](https://documentation.onesignal.com/)
- Check [Capacitor Documentation](https://capacitorjs.com/docs)

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ App builds without errors on both platforms
- ✅ Push notification permission is requested on first launch
- ✅ Test notifications are received on the device
- ✅ External user ID appears in OneSignal dashboard after web app login
- ✅ Microphone permission works when needed
- ✅ Web app loads correctly in the iframe
- ✅ No console errors in production build

## 📞 Support

If you encounter issues:
1. Check `ONESIGNAL_SETUP.md` troubleshooting section
2. Review device logs for error messages
3. Verify all configuration files are correct
4. Ensure Firebase and APNs credentials are properly set up
5. Test on different devices and OS versions

---

**Good luck with your deployment! 🚀**
