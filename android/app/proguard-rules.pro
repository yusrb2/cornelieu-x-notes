# Cornelieu X Notes - R8 / ProGuard Rules (Capacitor 8)
# Preserve reflection & @JavascriptInterface bridges while allowing R8 shrinking.

-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor core & plugins (@capacitor/keyboard, @capacitor/status-bar)
-keep public class * extends com.getcapacitor.Plugin
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod <methods>;
}
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.getcapacitor.** { *; }

# Cordova plugin bridge classes
-keep class org.apache.cordova.** { *; }
-keep class * extends org.apache.cordova.CordovaPlugin { *; }

# App native entry point & WebView interfaces
-keep class com.cornelieux.notes.** { *; }

-dontwarn com.getcapacitor.**
-dontwarn org.apache.cordova.**
