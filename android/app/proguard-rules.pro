# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Preserve Line Numbers and Annotations for Debugging
-keepattributes SourceFile,LineNumberTable,Signature,InnerClasses,EnclosingMethod,*Annotation*

# Capacitor Bridge & JavascriptInterface reflection rules
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }

# Keep all Capacitor Plugins and annotations
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
    @com.getcapacitor.annotation.PluginMethod public *;
}

# Android WebKit & Bridge preservation
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String);
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
}

-keepclassmembers class * extends android.webkit.WebChromeClient {
    public void *(android.webkit.WebView, ...);
}

# Keep Cordova plugin bridges if active
-keep class org.apache.cordova.** { *; }

# Keep R classes
-keepclassmembers class **.R$* {
    public static <fields>;
}

# Don't warn on optional google/okhttp references
-dontwarn okio.**
-dontwarn com.google.android.gms.**
