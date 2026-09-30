package pro.voxer.app.push

import android.content.Context
import android.content.SharedPreferences

/**
 * Caches the push registration (an FCM token, or a UnifiedPush subscription as JSON) so the page can
 * register it as soon as it loads. The web does the actual registration with the backend (see
 * `hooks/device/useNativePushRegistration.ts`).
 */
class PushTokenStore(context: Context) {

    private val prefs = context.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE)

    var token: String?
        get() = prefs.getString(KEY_TOKEN, null)
        set(value) {
            prefs.edit().apply {
                if (value.isNullOrBlank()) remove(KEY_TOKEN) else putString(KEY_TOKEN, value)
            }.apply()
        }

    /** The server's VAPID public key, handed over by the page; UnifiedPush distributors may require it. */
    var vapidPublicKey: String?
        get() = prefs.getString(KEY_VAPID, null)
        set(value) {
            prefs.edit().apply {
                if (value.isNullOrBlank()) remove(KEY_VAPID) else putString(KEY_VAPID, value)
            }.apply()
        }

    /**
     * `shouldShowRequestPermissionRationale` returns false both when the permission is blocked and when
     * it was never asked. Without this flag the two cases look the same and the app never shows the
     * dialog again.
     */
    var notificationPermissionAsked: Boolean
        get() = prefs.getBoolean(KEY_ASKED, false)
        set(value) {
            prefs.edit().putBoolean(KEY_ASKED, value).apply()
        }

    /**
     * Calls [onChange] when the registration changes, including from a background service. The caller
     * must keep the returned listener: preferences only hold it weakly.
     */
    fun listen(onChange: (String?) -> Unit): SharedPreferences.OnSharedPreferenceChangeListener {
        val listener = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
            if (key == KEY_TOKEN) onChange(token)
        }
        prefs.registerOnSharedPreferenceChangeListener(listener)
        return listener
    }

    fun unlisten(listener: SharedPreferences.OnSharedPreferenceChangeListener) =
        prefs.unregisterOnSharedPreferenceChangeListener(listener)

    companion object {
        /** Excluded from backups in backup_rules.xml / data_extraction_rules.xml. */
        const val FILE_NAME = "voxer_push"
        private const val KEY_TOKEN = "push_token"
        private const val KEY_VAPID = "vapid_public_key"
        private const val KEY_ASKED = "notification_permission_asked"
    }
}
