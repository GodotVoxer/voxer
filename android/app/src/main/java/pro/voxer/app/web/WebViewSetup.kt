package pro.voxer.app.web

import android.annotation.SuppressLint
import android.content.Context
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.core.content.ContextCompat
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import pro.voxer.app.BuildConfig
import pro.voxer.app.R

@SuppressLint("SetJavaScriptEnabled")
fun WebView.applyVoxerSettings(context: Context) {
    settings.apply {
        // Voxer is Next.js + React: without JS there is nothing to show.
        javaScriptEnabled = true

        // localStorage is load-bearing: `voxer.theme.v1`, `voxer.theme.device.v1` and the custom theme
        // variables cache read by the inline script of app/layout.tsx. Without it the theme flashes on
        // every load.
        domStorageEnabled = true

        // The detail `<video>` and the YouTube embed: without this, play() from JS fails silently.
        mediaPlaybackRequiresUserGesture = false

        // Honors Next's <meta viewport> (which already has viewport-fit=cover). Without it the WebView
        // assumes a 980px viewport and the whole responsive layout breaks.
        useWideViewPort = true
        loadWithOverviewMode = false

        // Pinch zoom breaks the fixed header and vaul drawers.
        setSupportZoom(false)
        builtInZoomControls = false
        displayZoomControls = false

        // The YouTube embed and target="_blank" open windows; without this the tap does nothing.
        setSupportMultipleWindows(true)
        javaScriptCanOpenWindowsAutomatically = false

        // Nothing local is loaded: the error screen is native, not a file://.
        allowFileAccess = false
        allowContentAccess = false

        // The site already forces HTTPS (HSTS + upgrade-insecure-requests); enforced hard here too.
        mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW

        cacheMode = WebSettings.LOAD_DEFAULT

        // APPEND, never replace: a custom UA breaks the YouTube player and Chromium heuristics. It lets
        // the server recognize the app.
        userAgentString = "$userAgentString VoxerAndroid/${BuildConfig.VERSION_NAME}"
    }

    // CRITICAL: the site already has its own dark theme. The WebView's algorithmic darkening would
    // darken it a second time and wreck the light theme.
    if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
        WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, false)
    }

    // The overscroll glow looks bad against the dark background and skews the virtualizer's math.
    overScrollMode = View.OVER_SCROLL_NEVER
    isVerticalScrollBarEnabled = false
    isHorizontalScrollBarEnabled = false

    // First source of the white flash: the WebView's own background before the first paint.
    setBackgroundColor(ContextCompat.getColor(context, R.color.voxer_surface_dark))

    if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)
}

fun configureVoxerCookies(webView: WebView) {
    CookieManager.getInstance().apply {
        setAcceptCookie(true)
        // All app traffic is same-origin (the API client uses baseURL "/api").
        setAcceptThirdPartyCookies(webView, false)
    }
}
