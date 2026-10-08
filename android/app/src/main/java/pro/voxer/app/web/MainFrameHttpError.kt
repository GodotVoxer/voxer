package pro.voxer.app.web

/** Decides whether a failed main-frame response means the site is down. */
object MainFrameHttpError {

    /**
     * WebView reports speculative prefetches (Cloudflare Speed Brain fires one on touchstart) as
     * main-frame requests, and Cloudflare refuses uncached ones with a 503.
     */
    fun isServerFailure(
        statusCode: Int,
        requestHeaders: Map<String, String>,
        responseHeaders: Map<String, String>,
    ): Boolean {
        if (statusCode < 500) return false
        if (responseHeaders.keys.any { it.equals("cf-speculation-refused", ignoreCase = true) }) {
            return false
        }
        val isPrefetch = requestHeaders.any { (name, value) ->
            (name.equals("sec-purpose", ignoreCase = true) || name.equals("purpose", ignoreCase = true)) &&
                value.contains("prefetch", ignoreCase = true)
        }
        return !isPrefetch
    }
}
