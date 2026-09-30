# R8 sees no static references to the bridge methods: only JavaScript calls them. Without this rule
# push registration and the file picker work in debug and fail SILENTLY in release.
-keepclassmembers class pro.voxer.app.web.VoxerJsBridge {
    @android.webkit.JavascriptInterface <methods>;
}

# The push payload is built from a Map of strings; keep its shape unobfuscated.
-keep class pro.voxer.app.push.PushPayload { *; }

# Firebase Messaging ships its own consumer rules in the AAR.
