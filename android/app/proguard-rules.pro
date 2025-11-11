# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ===========================
# Capacitor Framework Rules
# ===========================
# Keep all Capacitor plugin classes and their methods
-keep public class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.CapacitorPlugin *;
    @com.getcapacitor.PluginMethod *;
    public <methods>;
}

# Keep all classes that use @CapacitorPlugin annotation
-keep @com.getcapacitor.annotation.CapacitorPlugin class * {
    @com.getcapacitor.PluginMethod *;
    public <methods>;
}

# Keep Capacitor bridge and core classes
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }

# Keep JavaScript interface for WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ===========================
# Custom Plugins Rules
# ===========================
# Keep NotifyBridge plugin
-keep class com.happyplantsclub.android.NotifyBridge { *; }
-keepclassmembers class com.happyplantsclub.android.NotifyBridge { *; }

# Keep BillingBridge plugin (for Play Store billing)
-keep class com.happyplantsclub.android.BillingBridge { *; }
-keepclassmembers class com.happyplantsclub.android.BillingBridge { *; }

# Keep BillingManager helper class
-keep class com.happyplantsclub.android.BillingManager { *; }
-keep class com.happyplantsclub.android.BillingManager$** { *; }

# ===========================
# OneSignal SDK Rules
# ===========================
-keep class com.onesignal.** { *; }
-keepclassmembers class com.onesignal.** { *; }
-dontwarn com.onesignal.**

# Keep OneSignal annotations
-keepattributes *Annotation*

# Keep Kotlin coroutines for OneSignal
-keep class kotlin.coroutines.** { *; }
-keep interface kotlin.coroutines.** { *; }

# ===========================
# Google Play Billing Rules
# ===========================
-keep class com.android.billingclient.** { *; }
-keepclassmembers class com.android.billingclient.** { *; }

# Keep billing result listeners
-keep interface com.android.billingclient.api.** { *; }

# Keep Purchase and SkuDetails classes
-keep class com.android.billingclient.api.Purchase { *; }
-keep class com.android.billingclient.api.SkuDetails { *; }
-keep class com.android.billingclient.api.ProductDetails { *; }
-keep class com.android.billingclient.api.BillingResult { *; }

# ===========================
# Google Play Services Rules
# ===========================
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# ===========================
# AndroidX and Support Library Rules
# ===========================
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# ===========================
# Kotlin Standard Library Rules
# ===========================
-keep class kotlin.** { *; }
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-keepclassmembers class **$WhenMappings {
    <fields>;
}

# ===========================
# JSON Serialization Rules
# ===========================
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod

# Keep JSON parsing classes
-keep class org.json.** { *; }

# ===========================
# Debugging Support (Optional - Remove for Production)
# ===========================
# Preserve line numbers for debugging stack traces
-keepattributes SourceFile,LineNumberTable

# Hide the original source file name (security)
-renamesourcefileattribute SourceFile

# ===========================
# WebView Rules
# ===========================
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, java.lang.String);
}
-keepclassmembers class * extends android.webkit.WebChromeClient {
    public void *(android.webkit.WebView, java.lang.String);
}

# ===========================
# General Android Rules
# ===========================
-keep class * extends android.app.Activity
-keep class * extends android.app.Application
-keep class * extends android.app.Service
-keep class * extends android.content.BroadcastReceiver
-keep class * extends android.content.ContentProvider

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Parcelable implementations
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ===========================
# Optimization Settings
# ===========================
# Allow aggressive optimizations for better code protection
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose
