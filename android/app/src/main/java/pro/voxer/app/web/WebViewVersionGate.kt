package pro.voxer.app.web

object WebViewVersionGate {

    /**
     * `oklch()` needs Chromium 111+. The theme defines its colors in `oklch`, so below that version the
     * app shows literally no colors. `minSdk` does not protect against this: a recent Android may have a
     * frozen WebView or no Play Services.
     */
    const val MIN_CHROMIUM = 111

    private val CHROME_VERSION = Regex("""Chrome/(\d+)""")

    fun chromiumMajor(userAgent: String): Int? =
        CHROME_VERSION.find(userAgent)?.groupValues?.getOrNull(1)?.toIntOrNull()

    /** An unreadable UA is assumed supported: better to let in than to block too much. */
    fun isSupported(userAgent: String): Boolean {
        val major = chromiumMajor(userAgent) ?: return true
        return major >= MIN_CHROMIUM
    }
}
