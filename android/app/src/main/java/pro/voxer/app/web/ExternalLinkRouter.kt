package pro.voxer.app.web

import android.net.Uri

sealed interface LinkDecision {
    /** Navigation within this site. */
    data object LoadInWebView : LinkDecision

    /** Custom Tab or external app (mailto:, tel:, another domain with a user gesture). */
    data class OpenExternally(val url: String) : LinkDecision

    /** `intent:` scheme, typically the embedded player's "watch on YouTube" button. */
    data class OpenIntentScheme(val raw: String) : LinkDecision

    /** Unrequested redirect to another host, or a dangerous scheme. */
    data object Block : LinkDecision
}

object ExternalLinkRouter {

    private val EXTERNAL_APP_SCHEMES = setOf("mailto", "tel", "sms", "geo")
    private val WEB_SCHEMES = setOf("http", "https")

    /**
     * The decision core, on strings so it can be tested without instrumentation. `isMainFrame` is key:
     * the YouTube player navigates inside its own iframe all the time, and without this filter the embed
     * jumps to the external browser as soon as it starts playing.
     */
    fun decide(
        scheme: String?,
        host: String?,
        url: String,
        isMainFrame: Boolean,
        hasGesture: Boolean,
        siteHost: String,
        trustedHosts: Set<String> = emptySet(),
    ): LinkDecision {
        if (!isMainFrame) return LinkDecision.LoadInWebView

        val s = scheme?.lowercase()
        val h = host?.lowercase()

        return when {
            s == "https" && h == siteHost.lowercase() -> LinkDecision.LoadInWebView
            // E.g. an SSO login in front of a private instance, which the site redirects to.
            s == "https" && h != null && h in trustedHosts -> LinkDecision.LoadInWebView
            s in EXTERNAL_APP_SCHEMES -> LinkDecision.OpenExternally(url)
            s == "intent" -> LinkDecision.OpenIntentScheme(url)
            s in WEB_SCHEMES && hasGesture -> LinkDecision.OpenExternally(url)
            // Without a gesture and to another host, it is a redirect the user did not ask for.
            else -> LinkDecision.Block
        }
    }

    fun decide(
        uri: Uri,
        isMainFrame: Boolean,
        hasGesture: Boolean,
        siteHost: String,
        trustedHosts: Set<String> = emptySet(),
    ): LinkDecision =
        decide(uri.scheme, uri.host, uri.toString(), isMainFrame, hasGesture, siteHost, trustedHosts)

    /** Parses the comma-separated `VOXER_TRUSTED_HOSTS` build setting. */
    fun parseHosts(raw: String): Set<String> =
        raw.split(',').map { it.trim().lowercase() }.filter { it.isNotEmpty() }.toSet()
}
