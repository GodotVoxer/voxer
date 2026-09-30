package pro.voxer.app.web

import android.net.Uri
import android.os.Message
import android.view.View
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import pro.voxer.app.BuildConfig

class VoxerWebChromeClient(
    private val fileChooser: FileChooserController,
    private val fullscreen: FullscreenVideoController,
    private val host: WebViewHost,
) : WebChromeClient() {

    override fun onShowFileChooser(
        webView: WebView,
        callback: ValueCallback<Array<Uri>>,
        params: FileChooserParams,
    ): Boolean = fileChooser.onShowFileChooser(callback, params)

    override fun onShowCustomView(view: View, callback: CustomViewCallback) =
        fullscreen.enter(view, callback)

    override fun onHideCustomView() = fullscreen.exit()

    /**
     * Needed because of `setSupportMultipleWindows(true)`: the embed's "Watch on YouTube" link opens a
     * new window. A throwaway WebView is created just to read where it wanted to go and route it.
     *
     * A window to this site (a `target="_blank"` to another vox in a comment) must be loaded by hand in
     * the main WebView: `handleLinkDecision` can only say "do not intercept", and here the one navigating
     * is the throwaway WebView, so the tap would die.
     */
    override fun onCreateWindow(
        view: WebView,
        isDialog: Boolean,
        isUserGesture: Boolean,
        resultMsg: Message,
    ): Boolean {
        val probe = WebView(view.context)
        probe.webViewClient = object : android.webkit.WebViewClient() {
            override fun shouldOverrideUrlLoading(
                probeView: WebView,
                request: android.webkit.WebResourceRequest,
            ): Boolean {
                val decision = ExternalLinkRouter.decide(
                    uri = request.url,
                    isMainFrame = true,
                    hasGesture = isUserGesture,
                    siteHost = BuildConfig.SITE_HOST,
                )
                if (decision is LinkDecision.LoadInWebView) host.openSiteUrl(request.url.toString())
                else host.handleLinkDecision(decision)
                probeView.destroy()
                return true
            }
        }
        (resultMsg.obj as? WebView.WebViewTransport)?.webView = probe
        resultMsg.sendToTarget()
        return true
    }
}
