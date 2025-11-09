# Security Best Practices

This document outlines the security measures implemented in Happy Plants Club to protect the app from reverse engineering and unauthorized access.

## Table of Contents
1. [Code Obfuscation (ProGuard/R8)](#code-obfuscation-proguardr8)
2. [Protecting Against Reverse Engineering](#protecting-against-reverse-engineering)
3. [API Key Protection](#api-key-protection)
4. [Purchase Verification](#purchase-verification)
5. [Additional Security Measures](#additional-security-measures)

---

## Code Obfuscation (ProGuard/R8)

### What is ProGuard/R8?

ProGuard and R8 are code shrinkers and obfuscators for Android apps. They:
- **Shrink code**: Remove unused classes, methods, and fields
- **Obfuscate code**: Rename classes, methods, and fields to meaningless names
- **Optimize code**: Improve performance by analyzing bytecode

Android Studio uses **R8** by default (the successor to ProGuard).

### How It's Configured

The app has code obfuscation **enabled** for release builds:

**File**: `android/app/build.gradle`
```gradle
buildTypes {
    release {
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### What Gets Obfuscated

When you build a release APK/AAB, R8 will:

1. **Rename classes**: 
   - `com.happyplantsclub.android.BillingManager` → `a.b.c`
   - `com.happyplantsclub.android.MainActivity` → `a.b.d`

2. **Rename methods**: 
   - `initializeBilling()` → `a()`
   - `queryProducts()` → `b()`

3. **Rename fields**: 
   - `private BillingClient billingClient` → `private BillingClient a`

4. **Remove unused code**: Any classes/methods not referenced are completely removed

### What DOESN'T Get Obfuscated

The following are protected by ProGuard rules in `proguard-rules.pro`:

- **Capacitor plugins**: Plugin classes and methods annotated with `@CapacitorPlugin` and `@PluginMethod`
- **OneSignal SDK classes**: Required for push notifications to work
- **Google Play Billing classes**: Required for in-app purchases
- **Native methods**: Android framework methods
- **Serializable/Parcelable classes**: Required for data passing

### Viewing Obfuscation Results

After building a release APK, R8 generates mapping files:

```
android/app/build/outputs/mapping/release/mapping.txt
```

This file shows:
- Original class names → Obfuscated names
- Original method names → Obfuscated names

**IMPORTANT**: Keep this file! You need it to de-obfuscate stack traces from crash reports.

---

## Protecting Against Reverse Engineering

### What Attackers Can Do

Even with obfuscation, determined attackers can:
1. Decompile your APK to read the Java/Kotlin code
2. Use tools like `apktool`, `jadx`, `dex2jar`
3. Analyze network traffic
4. Modify the app and re-sign it

### What Obfuscation Prevents

✅ **Makes code harder to read**: Obfuscated code is difficult to understand
✅ **Hides business logic**: Complex algorithms become unreadable
✅ **Increases reverse engineering effort**: Attackers need more time and skill
✅ **Protects against casual theft**: Prevents copy-paste of your code

### What Obfuscation DOESN'T Prevent

❌ **Determined attackers**: With enough effort, obfuscated code can be understood
❌ **Network sniffing**: SSL/TLS is still required for network security
❌ **Runtime analysis**: Attackers can debug the running app
❌ **Extracting secrets**: Hardcoded API keys can still be found

---

## API Key Protection

### Never Hardcode Secrets in Your App

**BAD** ❌:
```java
public class Config {
    public static final String API_KEY = "sk_live_1234567890abcdef";
    public static final String DATABASE_PASSWORD = "mypassword123";
}
```

Even with obfuscation, these strings can be found by:
1. Decompiling the APK
2. Searching the strings.xml or compiled resources
3. Using tools like `strings` command on the APK

### Best Practices for API Keys

#### 1. Use Backend APIs

**GOOD** ✅:
```javascript
// Web app code
async function getUserData() {
  // Call your backend, which has the API key
  const response = await fetch('https://api.yourbackend.com/user/data', {
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  });
  return response.json();
}
```

**Backend** (Node.js example):
```javascript
// Backend server - API key is safe here
const apiKey = process.env.SECRET_API_KEY;

app.get('/user/data', authenticateUser, async (req, res) => {
  // Use the API key to call third-party service
  const data = await thirdPartyService.getData(apiKey);
  res.json(data);
});
```

#### 2. Use Build Configuration for Non-Critical Keys

For less sensitive keys (like OneSignal App ID), you can use build configuration:

**File**: `android/app/build.gradle`
```gradle
android {
    defaultConfig {
        // Define in build.gradle or gradle.properties
        buildConfigField "String", "ONESIGNAL_APP_ID", "\"${ONESIGNAL_APP_ID}\""
    }
}
```

**File**: `gradle.properties` (not in version control)
```properties
ONESIGNAL_APP_ID=3f0b6a12-b2d3-4c56-8e76-de9baafc41de
```

**Usage**:
```java
String appId = BuildConfig.ONESIGNAL_APP_ID;
```

This doesn't make it secure, but makes it easier to manage different keys for debug/release builds.

#### 3. Use Android Keystore for Encryption Keys

For cryptographic keys, use Android Keystore:

```java
KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
keyStore.load(null);

// Generate or retrieve key
KeyGenerator keyGenerator = KeyGenerator.getInstance(
    KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore"
);
keyGenerator.init(new KeyGenParameterSpec.Builder(
    "my_key",
    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
).build());
SecretKey key = keyGenerator.generateKey();
```

---

## Purchase Verification

### Why Backend Verification is Critical

**The Problem**: 
- Anyone can modify the app and fake a successful purchase
- Without server-side verification, users can bypass payment

**The Solution**: 
- Always verify purchases on your backend server
- Never trust purchase status from the client app alone

### Implementation

#### 1. Client-Side (App)

```java
// Query purchases
BillingBridge.queryPurchases().then(result => {
  if (result.purchases && result.purchases.length > 0) {
    const purchaseToken = result.purchases[0].purchaseToken;
    
    // Send to backend for verification
    verifyPurchaseOnBackend(purchaseToken);
  }
});

async function verifyPurchaseOnBackend(purchaseToken) {
  const response = await fetch('https://api.yourbackend.com/verify-purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userAuthToken}`
    },
    body: JSON.stringify({
      purchaseToken: purchaseToken,
      productId: 'premium_monthly'
    })
  });
  
  const result = await response.json();
  if (result.verified) {
    // Grant premium access
    enablePremiumFeatures();
  }
}
```

#### 2. Backend (Server)

```javascript
// Node.js backend example
const { google } = require('googleapis');

app.post('/verify-purchase', authenticateUser, async (req, res) => {
  const { purchaseToken, productId } = req.body;
  const userId = req.user.id;
  
  try {
    // Verify with Google Play Developer API
    const androidpublisher = google.androidpublisher({
      version: 'v3',
      auth: serviceAccountAuth
    });
    
    const result = await androidpublisher.purchases.subscriptions.get({
      packageName: 'com.happyplantsclub.android',
      subscriptionId: productId,
      token: purchaseToken
    });
    
    // Check if purchase is valid
    const isValid = result.data.paymentState === 1;
    const expiryTime = parseInt(result.data.expiryTimeMillis);
    const isExpired = Date.now() > expiryTime;
    
    if (isValid && !isExpired) {
      // Update database - user has premium
      await db.updateUserSubscription(userId, {
        subscriptionActive: true,
        expiryTime: expiryTime,
        productId: productId
      });
      
      res.json({ verified: true });
    } else {
      res.json({ verified: false, reason: 'Subscription expired or invalid' });
    }
  } catch (error) {
    console.error('Purchase verification failed:', error);
    res.status(500).json({ verified: false, reason: 'Verification error' });
  }
});
```

### Google Play Developer API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable **Google Play Android Developer API**
4. Create a **Service Account**
5. Generate a **JSON key file**
6. In Play Console, grant the service account **View financial data** permissions

---

## Additional Security Measures

### 1. Certificate Pinning (Optional)

Pin your SSL certificate to prevent man-in-the-middle attacks:

```java
// OkHttp certificate pinning
CertificatePinner certificatePinner = new CertificatePinner.Builder()
    .add("api.yourbackend.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
    .build();

OkHttpClient client = new OkHttpClient.Builder()
    .certificatePinner(certificatePinner)
    .build();
```

### 2. Root Detection (Optional)

Detect if the device is rooted:

```java
public boolean isDeviceRooted() {
    String[] paths = {
        "/system/app/Superuser.apk",
        "/sbin/su",
        "/system/bin/su",
        "/system/xbin/su"
    };
    for (String path : paths) {
        if (new File(path).exists()) return true;
    }
    return false;
}
```

### 3. Tamper Detection (Optional)

Verify the app signature hasn't been modified:

```java
public boolean verifySignature(Context context) {
    try {
        PackageInfo packageInfo = context.getPackageManager()
            .getPackageInfo(context.getPackageName(), PackageManager.GET_SIGNATURES);
        
        Signature[] signatures = packageInfo.signatures;
        MessageDigest md = MessageDigest.getInstance("SHA");
        md.update(signatures[0].toByteArray());
        
        String currentSignature = Base64.encodeToString(md.digest(), Base64.DEFAULT);
        String expectedSignature = "YOUR_EXPECTED_SIGNATURE_HASH";
        
        return currentSignature.equals(expectedSignature);
    } catch (Exception e) {
        return false;
    }
}
```

### 4. Use HTTPS Only

Always use HTTPS for network requests:

```java
// In AndroidManifest.xml
<application
    android:usesCleartextTraffic="false">
```

### 5. Secure Local Storage

Don't store sensitive data in:
- SharedPreferences (unencrypted by default)
- Internal storage (readable if device is rooted)
- External storage (readable by other apps)

Use:
- **EncryptedSharedPreferences** for sensitive preferences
- **Android Keystore** for encryption keys
- **Backend storage** for critical data

```java
// Encrypted SharedPreferences
MasterKey masterKey = new MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build();

SharedPreferences sharedPreferences = EncryptedSharedPreferences.create(
    context,
    "secure_prefs",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
);
```

---

## Security Checklist

Before releasing your app:

- [ ] ProGuard/R8 obfuscation is **enabled** (`minifyEnabled true`)
- [ ] ProGuard rules properly configured
- [ ] No API keys or secrets hardcoded in the app
- [ ] All sensitive operations use backend APIs
- [ ] Purchase verification implemented on backend
- [ ] HTTPS used for all network requests
- [ ] Cleartext traffic disabled
- [ ] Sensitive data encrypted in local storage
- [ ] Test the release APK/AAB, not debug builds
- [ ] Keep ProGuard mapping files for crash analysis
- [ ] Set up Google Play Developer API for purchase verification

---

## Understanding the Limitations

**Remember**: 
- Code obfuscation is not encryption
- A determined attacker can still reverse engineer your app
- Security is about layers - make it difficult enough that it's not worth the effort
- The most sensitive operations should always be on your backend server

**Focus on**:
1. Making reverse engineering difficult (obfuscation)
2. Moving critical logic to the backend (API keys, purchases)
3. Verifying everything server-side (don't trust the client)

---

## Additional Resources

- [Android Security Best Practices](https://developer.android.com/topic/security/best-practices)
- [R8 Documentation](https://developer.android.com/studio/build/shrink-code)
- [ProGuard Manual](https://www.guardsquare.com/manual/home)
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [Google Play Developer API](https://developers.google.com/android-publisher)

---

## License

ISC
