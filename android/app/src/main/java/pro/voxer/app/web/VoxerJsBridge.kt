package pro.voxer.app.web

import android.webkit.JavascriptInterface
import org.json.JSONObject
import pro.voxer.app.push.VoxNotificationCleanup

/** What the Activity must answer for the bridge. */
interface BridgeHost {
    fun appInfoJson(): String
    fun cachedPushToken(): String?
    fun requestPushToken()
    fun setPushVapidKey(key: String)
    fun notificationPermissionState(): String
    fun openAppNotificationSettings()
    fun setBadgeCount(total: Int)
    fun setThemeColors(resolvedMode: String, surfaceHex: String)
    fun setGestureLock(locked: Boolean)
    fun shareSitePath(path: String, title: String?)
    fun clearVoxNotifications(voxId: String)
}

/**
 * Minimal surface on purpose. The site's CSP allows `script-src 'unsafe-inline'` (to avoid forcing
 * dynamic rendering on every page), so an XSS would reach this object. No method touches the
 * filesystem, opens arbitrary intents, runs commands or returns the session cookie. An
 * `openExternal(url)`, if ever added, must allow only https/mailto and reject `intent:`, `file:` and
 * `javascript:`.
 */
class VoxerJsBridge(private val host: BridgeHost) {

    @JavascriptInterface
    fun appInfo(): String = host.appInfoJson()

    @JavascriptInterface
    fun getPushToken(): String? = host.cachedPushToken()

    @JavascriptInterface
    fun requestPushToken() = host.requestPushToken()

    /** The server's VAPID public key, for UnifiedPush; anything else is ignored. */
    @JavascriptInterface
    fun setPushVapidKey(key: String) {
        if (VAPID_PUBLIC_KEY.matches(key)) host.setPushVapidKey(key)
    }

    /** "granted" | "denied" | "blocked" | "unsupported" */
    @JavascriptInterface
    fun notificationPermissionState(): String = host.notificationPermissionState()

    @JavascriptInterface
    fun openAppNotificationSettings() = host.openAppNotificationSettings()

    @JavascriptInterface
    fun setBadgeCount(total: Int) = host.setBadgeCount(total)

    @JavascriptInterface
    fun setThemeColors(resolvedMode: String, surfaceHex: String) {
        if (!HEX_COLOR.matches(surfaceHex)) return
        host.setThemeColors(resolvedMode, surfaceHex)
    }

    @JavascriptInterface
    fun setGestureLock(locked: Boolean) = host.setGestureLock(locked)

    /**
     * Takes a path of this site, not a URL: the Activity builds it with `BuildConfig.SITE_URL`, so an
     * XSS cannot open the system sheet with a link to another domain.
     */
    @JavascriptInterface
    fun share(path: String, title: String?) {
        host.shareSitePath(path, title?.take(SHARE_TITLE_MAX))
    }

    /** Only removes this app's own rows for that vox. */
    @JavascriptInterface
    fun clearVoxNotifications(voxId: String) {
        if (VoxNotificationCleanup.VOX_ID.matches(voxId)) host.clearVoxNotifications(voxId)
    }

    companion object {
        const val NAME = "VoxerAndroid"
        private const val SHARE_TITLE_MAX = 120
        private val HEX_COLOR = Regex("^#[0-9a-fA-F]{6}$")
        private val VAPID_PUBLIC_KEY = Regex("^[A-Za-z0-9_-]{87}$")

        fun appInfoJson(
            versionName: String,
            versionCode: Int,
            sdkInt: Int,
            packageName: String,
            pushProvider: String,
            pushAvailable: Boolean,
        ): String =
            JSONObject()
                .put("platform", "android")
                .put("versionName", versionName)
                .put("versionCode", versionCode)
                .put("sdkInt", sdkInt)
                .put("packageName", packageName)
                .put("pushProvider", pushProvider)
                .put("pushAvailable", pushAvailable)
                .toString()
    }
}
