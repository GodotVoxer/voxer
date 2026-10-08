package pro.voxer.app.web

import android.graphics.Bitmap
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import pro.voxer.app.BuildConfig

interface WebViewHost {
    fun onFirstPaint()
    fun showConnectionError(retryUrl: String, offline: Boolean)
    fun hideConnectionError()
    fun handleLinkDecision(decision: LinkDecision): Boolean
    fun openSiteUrl(url: String)
    fun onRendererGone(lastUrl: String?)
}

class VoxerWebViewClient(private val host: WebViewHost) : WebViewClient() {

    private var lastUrl: String? = null

    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        val decision = ExternalLinkRouter.decide(
            uri = request.url,
            isMainFrame = request.isForMainFrame,
            hasGesture = request.hasGesture(),
            siteHost = BuildConfig.SITE_HOST,
            trustedHosts = TRUSTED_HOSTS,
        )
        return host.handleLinkDecision(decision)
    }

    override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
        lastUrl = url
        host.hideConnectionError()
    }

    /** First real pixel. `onPageFinished` comes much later, once subresources are loaded. */
    override fun onPageCommitVisible(view: WebView, url: String) {
        host.onFirstPaint()
    }

    override fun onReceivedError(
        view: WebView,
        request: WebResourceRequest,
        error: android.webkit.WebResourceError,
    ) {
        // Main frame only: a failing R2 image must not blank the app.
        if (!request.isForMainFrame) return
        host.showConnectionError(request.url.toString(), offline = true)
    }

    override fun onReceivedHttpError(
        view: WebView,
        request: WebResourceRequest,
        errorResponse: WebResourceResponse,
    ) {
        if (!request.isForMainFrame) return
        val serverFailure = MainFrameHttpError.isServerFailure(
            statusCode = errorResponse.statusCode,
            requestHeaders = request.requestHeaders.orEmpty(),
            responseHeaders = errorResponse.responseHeaders.orEmpty(),
        )
        if (!serverFailure) return
        host.showConnectionError(request.url.toString(), offline = false)
    }

    /**
     * Required: when Chromium kills the renderer with the app in the background, the whole process
     * crashes without this.
     */
    override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
        host.onRendererGone(lastUrl)
        return true
    }

    private companion object {
        val TRUSTED_HOSTS = ExternalLinkRouter.parseHosts(BuildConfig.TRUSTED_HOSTS)
    }
}
