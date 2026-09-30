package pro.voxer.app.push

import org.json.JSONObject

/** Wire formats shared with the web app for UnifiedPush. */
object UnifiedPushData {
    private val VAPID_RE = Regex("^[A-Za-z0-9_-]{87}$")

    fun isVapidPublicKey(value: String): Boolean = VAPID_RE.matches(value)

    /** What `getPushToken()` returns in this flavor; the page registers it as a Web Push subscription. */
    fun registrationJson(endpoint: String, p256dh: String, auth: String): String =
        JSONObject()
            .put("endpoint", endpoint)
            .put("p256dh", p256dh)
            .put("auth", auth)
            .toString()

    /** The server sends the same string map as the FCM data payload, as a JSON object. */
    fun parseMessage(raw: String): Map<String, String>? {
        val json = runCatching { JSONObject(raw) }.getOrNull() ?: return null
        val out = mutableMapOf<String, String>()
        for (key in json.keys()) {
            val value = json.opt(key)
            if (value is String) out[key] = value
        }
        return out
    }
}
