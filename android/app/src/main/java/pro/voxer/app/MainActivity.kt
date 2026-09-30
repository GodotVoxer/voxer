package pro.voxer.app

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.provider.Settings
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.addCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.view.updatePadding
import pro.voxer.app.databinding.ActivityMainBinding
import pro.voxer.app.push.DeepLinkResolver
import pro.voxer.app.push.FlavorPush
import pro.voxer.app.push.PushTokenStore
import pro.voxer.app.web.BridgeHost
import pro.voxer.app.web.DownloadController
import pro.voxer.app.web.FileChooserController
import pro.voxer.app.web.FullscreenVideoController
import pro.voxer.app.web.LinkDecision
import pro.voxer.app.web.PullToRefreshGate
import pro.voxer.app.web.VoxerJsBridge
import pro.voxer.app.web.VoxerWebChromeClient
import pro.voxer.app.web.VoxerWebViewClient
import pro.voxer.app.web.WebViewHost
import pro.voxer.app.web.WebViewVersionGate
import pro.voxer.app.web.applyVoxerSettings
import pro.voxer.app.web.configureVoxerCookies
import org.json.JSONObject
import org.json.JSONTokener

class MainActivity : ComponentActivity(), WebViewHost, BridgeHost {

    private lateinit var binding: ActivityMainBinding
    private lateinit var fileChooser: FileChooserController
    private lateinit var fullscreen: FullscreenVideoController
    private lateinit var downloads: DownloadController
    private var lastTouchX = 0f
    private var lastTouchY = 0f
    private lateinit var pushTokens: PushTokenStore
    private var pushTokenListener: android.content.SharedPreferences.OnSharedPreferenceChangeListener? = null
    private val pushProvider = FlavorPush.provider

    private var firstPaintDone = false
    private var gestureLocked = false
    private var siteLoaded = false
    private var webViewDestroyed = false
    private var lastOverlayBackMs = 0L
    private var refreshSequence = 0

    // The token is registered only if the user granted permission: otherwise the server would push
    // forever to a row that can never show anything.
    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) registerPush() else emitPushToken(null)
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        splash.setKeepOnScreenCondition { !firstPaintDone }
        // On a slow network the splash must not hang forever.
        window.decorView.postDelayed({ firstPaintDone = true }, SPLASH_MAX_MS)

        // Needed for env(safe-area-inset-*) to be non-zero inside the WebView; the site already sends
        // viewport-fit=cover from app/layout.tsx.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode =
                android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        pushTokens = PushTokenStore(this)
        // UnifiedPush endpoints arrive later, in a service: forward every change to the page.
        pushTokenListener = pushTokens.listen { token -> emitPushToken(token) }
        applyRememberedSurfaceColor()

        if (!WebViewVersionGate.isSupported(defaultUserAgent())) {
            showWebViewOutdated()
            return
        }

        setupWebView()
        setupPullToRefresh()
        applyInsets()
        setupBackHandling()

        if (savedInstanceState != null) {
            binding.webView.restoreState(savedInstanceState)
            siteLoaded = true
        } else {
            val target = intent?.let { deepLinkFrom(it) } ?: BuildConfig.SITE_URL
            binding.webView.loadUrl(target)
        }
    }

    private fun setupWebView() {
        fullscreen = FullscreenVideoController(this, binding.fullscreenContainer, binding.webView)
        fileChooser = FileChooserController(this)
        downloads = DownloadController(this)

        binding.webView.apply {
            applyVoxerSettings(this@MainActivity)
            webViewClient = VoxerWebViewClient(this@MainActivity)
            webChromeClient = VoxerWebChromeClient(fileChooser, fullscreen, this@MainActivity)
            addJavascriptInterface(VoxerJsBridge(this@MainActivity), VoxerJsBridge.NAME)
            setDownloadListener { url, userAgent, disposition, mimeType, _ ->
                downloads.enqueue(url, userAgent, disposition, mimeType)
            }
            @Suppress("ClickableViewAccessibility")
            setOnTouchListener { _, event ->
                if (event.actionMasked == MotionEvent.ACTION_DOWN) {
                    lastTouchX = event.x
                    lastTouchY = event.y
                }
                false
            }
            setOnLongClickListener { view -> handleLongPress(view as WebView) }
        }
        configureVoxerCookies(binding.webView)
        binding.errorRetry.setOnClickListener {
            binding.errorContainer.visibility = View.GONE
            binding.webView.reload()
        }
    }

    private fun setupPullToRefresh() {
        binding.pullToRefresh.apply {
            setSize(androidx.swiperefreshlayout.widget.SwipeRefreshLayout.LARGE)
            setColorSchemeResources(R.color.voxer_brand)
            setProgressBackgroundColorSchemeResource(R.color.voxer_surface_dark)
            setDistanceToTriggerSync(dp(PULL_TRIGGER_DP))
            setSlingshotDistance(dp(PULL_SLINGSHOT_DP))
            setOnChildScrollUpCallback { _, _ ->
                !PullToRefreshGate.canStart(
                    canScrollUp = binding.webView.canScrollVertically(-1),
                    gestureLocked = gestureLocked,
                    fullscreenActive = fullscreen.isActive,
                    connectionErrorVisible = binding.errorContainer.visibility == View.VISIBLE,
                    siteLoaded = siteLoaded,
                )
            }
            setOnRefreshListener {
                val sequence = ++refreshSequence
                binding.webView.reload()
                postDelayed({
                    if (refreshSequence == sequence) isRefreshing = false
                }, REFRESH_TIMEOUT_MS)
            }
        }
    }

    private fun finishPullToRefresh() {
        refreshSequence++
        binding.pullToRefresh.isRefreshing = false
    }

    /**
     * HitTestResult does not report `<video>` (and says IMAGE_TYPE over the poster), so the DOM is
     * asked for a `data-download-video` under the finger first; without a video it falls back to the image menu.
     */
    private fun handleLongPress(webView: WebView): Boolean {
        val result = webView.hitTestResult
        val image = when (result.type) {
            WebView.HitTestResult.IMAGE_TYPE,
            WebView.HitTestResult.SRC_IMAGE_ANCHOR_TYPE,
            -> result.extra?.takeIf { it.isNotBlank() }
            else -> null
        }
        val density = resources.displayMetrics.density
        val x = lastTouchX / density
        val y = lastTouchY / density
        val script = "(function(){var e=document.elementFromPoint($x,$y);" +
            "var h=e&&e.closest('[data-download-video]');" +
            "return h?h.getAttribute('data-download-video'):null})()"
        webView.evaluateJavascript(script) { raw ->
            val video = runCatching { JSONTokener(raw).nextValue() as? String }.getOrNull()
            val userAgent = webView.settings.userAgentString
            when {
                !video.isNullOrBlank() -> downloads.showVideoMenu(video, userAgent, ::shareUrl)
                image != null -> downloads.showImageMenu(image, userAgent, ::shareUrl)
            }
        }
        return image != null
    }

    /**
     * With `setDecorFitsSystemWindows(false)`, `adjustResize` stops working and the keyboard would cover
     * the comment composer, so the IME inset is applied by hand.
     */
    private fun applyInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, insets ->
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.updatePadding(bottom = maxOf(ime.bottom, bars.bottom))
            binding.pullToRefresh.setProgressViewOffset(
                false,
                bars.top + dp(PULL_START_OFFSET_DP),
                bars.top + dp(PULL_END_OFFSET_DP),
            )
            insets
        }
    }

    private fun setupBackHandling() {
        onBackPressedDispatcher.addCallback(this) {
            when {
                fullscreen.isActive -> fullscreen.exit()
                // Neither Radix nor vaul push history: without this, back with the sidebar open closed the app.
                // The page reports an open layer through `setGestureLock`.
                shouldCloseWebOverlay() -> closeWebOverlay()
                binding.webView.canGoBack() -> binding.webView.goBack()
                else -> finish()
            }
        }
    }

    /**
     * Safety net: if the page's flag got stuck on `true`, two quick back presses ignore the lock so the
     * app never becomes inescapable.
     */
    private fun shouldCloseWebOverlay(): Boolean {
        if (!gestureLocked || webViewDestroyed) return false
        val now = SystemClock.elapsedRealtime()
        val repeated = now - lastOverlayBackMs < OVERLAY_BACK_ESCAPE_WINDOW_MS
        lastOverlayBackMs = now
        return !repeated
    }

    /** Radix and vaul close on Escape; it is dispatched on the document, where they listen. */
    private fun closeWebOverlay() {
        binding.webView.evaluateJavascript(
            "document.dispatchEvent(new KeyboardEvent('keydown'," +
                "{key:'Escape',code:'Escape',keyCode:27,which:27,bubbles:true,cancelable:true}))",
            null,
        )
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val path = deepLinkPathFrom(intent) ?: return
        if (siteLoaded) {
            // Client-side navigation keeps the vox store, the comment caches and the scroll.
            evaluateNative("navigate", JSONObject.quote(path))
        } else {
            binding.webView.loadUrl(BuildConfig.SITE_URL + path)
        }
    }

    override fun onFirstPaint() {
        firstPaintDone = true
        siteLoaded = true
        finishPullToRefresh()
        // The splash covers the screen until here: this is the startup the user perceives, and the one
        // Android measures ("Fully drawn" in logcat), not the splash's first frame.
        reportFullyDrawn()
    }

    override fun showConnectionError(retryUrl: String, offline: Boolean) {
        firstPaintDone = true
        finishPullToRefresh()
        binding.errorTitle.setText(if (offline) R.string.error_offline_title else R.string.error_server_title)
        binding.errorBody.setText(if (offline) R.string.error_offline_body else R.string.error_server_body)
        binding.errorContainer.visibility = View.VISIBLE
    }

    override fun hideConnectionError() {
        binding.errorContainer.visibility = View.GONE
    }

    override fun onRendererGone(lastUrl: String?) {
        // The WebView is unusable: discard it and recreate the whole Activity.
        destroyWebView()
        recreate()
    }

    override fun handleLinkDecision(decision: LinkDecision): Boolean = when (decision) {
        is LinkDecision.LoadInWebView -> false
        is LinkDecision.OpenExternally -> {
            openExternally(decision.url)
            true
        }
        is LinkDecision.OpenIntentScheme -> {
            openIntentScheme(decision.raw)
            true
        }
        is LinkDecision.Block -> true
    }

    /**
     * New window to this site (a link to another vox inside a comment). Navigates with the router, like
     * `onNewIntent`, to keep the vox store and the comment caches.
     */
    override fun openSiteUrl(url: String) {
        val path = DeepLinkResolver.relative(Uri.parse(url), BuildConfig.SITE_URL)
        if (siteLoaded && path != null) {
            evaluateNative("navigate", JSONObject.quote(path))
        } else {
            binding.webView.loadUrl(url)
        }
    }

    private fun openExternally(url: String) {
        val uri = Uri.parse(url)
        if (uri.scheme == "http" || uri.scheme == "https") {
            runCatching {
                CustomTabsIntent.Builder()
                    .setShowTitle(true)
                    .build()
                    .launchUrl(this, uri)
            }.onFailure { startActivitySafely(Intent(Intent.ACTION_VIEW, uri)) }
        } else {
            startActivitySafely(Intent(Intent.ACTION_VIEW, uri))
        }
    }

    private fun openIntentScheme(raw: String) {
        val intent = runCatching { Intent.parseUri(raw, Intent.URI_INTENT_SCHEME) }.getOrNull() ?: return
        try {
            startActivity(intent)
        } catch (_: ActivityNotFoundException) {
            // Normal path of the "watch on YouTube" button when the app is not installed.
            intent.getStringExtra("browser_fallback_url")?.let { openExternally(it) }
        }
    }

    private fun startActivitySafely(intent: Intent) {
        runCatching { startActivity(intent) }
    }

    private fun shareUrl(url: String) = shareText(url, null)

    private fun shareText(text: String, subject: String?) {
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
            if (!subject.isNullOrBlank()) putExtra(Intent.EXTRA_SUBJECT, subject)
        }
        startActivitySafely(Intent.createChooser(send, null))
    }

    override fun appInfoJson(): String =
        VoxerJsBridge.appInfoJson(
            versionName = BuildConfig.VERSION_NAME,
            versionCode = BuildConfig.VERSION_CODE,
            sdkInt = Build.VERSION.SDK_INT,
            packageName = BuildConfig.APPLICATION_ID,
            pushProvider = pushProvider.id,
            pushAvailable = pushProvider.isAvailable(this),
        )

    override fun cachedPushToken(): String? = pushTokens.token

    override fun requestPushToken() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            // Asked here rather than at startup: the page only calls this once there is a session.
            pushTokens.notificationPermissionAsked = true
            requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            return
        }
        registerPush()
    }

    override fun setPushVapidKey(key: String) {
        pushTokens.vapidPublicKey = key
    }

    private fun registerPush() = pushProvider.register(this) { token -> emitPushToken(token) }

    private fun emitPushToken(token: String?) {
        val arg = if (token == null) "null" else JSONObject.quote(token)
        evaluateNative("onPushToken", arg)
    }

    override fun notificationPermissionState(): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return "granted"
        val granted = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        if (granted) return "granted"
        // If we never asked, we still can: it is "blocked" only after asking, once the system stops
        // offering the dialog.
        if (!pushTokens.notificationPermissionAsked) return "denied"
        return if (shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) "denied"
        else "blocked"
    }

    override fun openAppNotificationSettings() {
        // A fixed system screen: the bridge never opens an intent parameterized from JS.
        val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
        startActivitySafely(intent)
    }

    override fun setBadgeCount(total: Int) {
        if (total <= 0) {
            androidx.core.app.NotificationManagerCompat.from(this).cancelAll()
        }
    }

    override fun setThemeColors(resolvedMode: String, surfaceHex: String) {
        val color = runCatching { Color.parseColor(surfaceHex) }.getOrNull() ?: return
        runOnUiThread {
            window.setBackgroundDrawable(ColorDrawable(color))
            binding.root.setBackgroundColor(color)
            binding.webView.setBackgroundColor(color)
            binding.pullToRefresh.setProgressBackgroundColorSchemeColor(color)
            // With a light theme the white system icons would be invisible over the header.
            WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars =
                resolvedMode == "light"
        }
        getSharedPreferences(PREFS_UI, MODE_PRIVATE).edit()
            .putString(KEY_SURFACE, surfaceHex)
            .putString(KEY_MODE, resolvedMode)
            .apply()
    }

    override fun setGestureLock(locked: Boolean) {
        gestureLocked = locked
    }

    /**
     * The WebView does not implement `navigator.share`, so the system sheet opens from here. The app
     * builds the URL: `absolute` rejects anything that is not a path of this site.
     */
    override fun shareSitePath(path: String, title: String?) {
        val url = DeepLinkResolver.absolute(path, BuildConfig.SITE_URL) ?: return
        // Bridge methods arrive on the JavaBridge thread, not the UI thread.
        runOnUiThread { shareText(url, title) }
    }

    override fun onPause() {
        super.onPause()
        if (webViewDestroyed) return
        // The cookie store is written to disk lazily: without this, if the OS kills the process right
        // after signing in, the session is lost.
        CookieManager.getInstance().flush()
        // Pausing the WebView stops timers and media while the app is in the background.
        binding.webView.onPause()
        binding.webView.pauseTimers()
    }

    override fun onResume() {
        super.onResume()
        if (webViewDestroyed) return
        binding.webView.onResume()
        binding.webView.resumeTimers()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        binding.webView.saveState(outState)
    }

    override fun onDestroy() {
        pushTokenListener?.let(pushTokens::unlisten)
        if (::fileChooser.isInitialized) fileChooser.cancelPending()
        destroyWebView()
        super.onDestroy()
    }

    /** Calling `WebView.destroy()` twice throws; `onRendererGone` may already have destroyed it. */
    private fun destroyWebView() {
        if (webViewDestroyed) return
        webViewDestroyed = true
        (binding.webView.parent as? ViewGroup)?.removeView(binding.webView)
        binding.webView.destroy()
    }

    private fun evaluateNative(fn: String, arg: String) {
        binding.webView.post {
            binding.webView.evaluateJavascript(
                "window.__voxerNative && window.__voxerNative.$fn && window.__voxerNative.$fn($arg)",
                null,
            )
        }
    }

    private fun deepLinkPathFrom(intent: Intent): String? {
        val uri = intent.data ?: return null
        return DeepLinkResolver.relative(uri, BuildConfig.SITE_URL)
    }

    private fun deepLinkFrom(intent: Intent): String? =
        deepLinkPathFrom(intent)?.let { BuildConfig.SITE_URL + it }

    /** The user may have the light theme stored: painting the dark one would flash. */
    private fun applyRememberedSurfaceColor() {
        val prefs = getSharedPreferences(PREFS_UI, MODE_PRIVATE)
        val hex = prefs.getString(KEY_SURFACE, null) ?: return
        val color = runCatching { Color.parseColor(hex) }.getOrNull() ?: return
        window.setBackgroundDrawable(ColorDrawable(color))
        binding.pullToRefresh.setProgressBackgroundColorSchemeColor(color)
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars =
            prefs.getString(KEY_MODE, null) == "light"
    }

    /** May throw when the system WebView is missing; then it is assumed supported. */
    private fun defaultUserAgent(): String =
        runCatching { android.webkit.WebSettings.getDefaultUserAgent(this) }.getOrElse { "" }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun showWebViewOutdated() {
        setContentView(R.layout.view_connection_error)
        findViewById<View>(R.id.errorContainer).visibility = View.VISIBLE
        findViewById<android.widget.TextView>(R.id.errorTitle).setText(R.string.webview_outdated_title)
        findViewById<android.widget.TextView>(R.id.errorBody).setText(R.string.webview_outdated_body)
        findViewById<android.widget.Button>(R.id.errorRetry).apply {
            setText(R.string.webview_outdated_action)
            setOnClickListener { startActivitySafely(webViewUpdateIntent()) }
        }
        firstPaintDone = true
    }

    /** The Play Store page in `gms`; elsewhere, the settings of whichever WebView the system uses. */
    private fun webViewUpdateIntent(): Intent {
        if (BuildConfig.HAS_PLAY_STORE) {
            return Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.webview"))
        }
        val webViewPackage = androidx.webkit.WebViewCompat.getCurrentWebViewPackage(this)?.packageName
            ?: return Intent(Settings.ACTION_SETTINGS)
        return Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", webViewPackage, null))
    }

    companion object {
        private const val SPLASH_MAX_MS = 2500L
        private const val OVERLAY_BACK_ESCAPE_WINDOW_MS = 1000L
        private const val REFRESH_TIMEOUT_MS = 15_000L
        private const val PULL_TRIGGER_DP = 72
        private const val PULL_SLINGSHOT_DP = 104
        private const val PULL_START_OFFSET_DP = 8
        private const val PULL_END_OFFSET_DP = 72
        private const val PREFS_UI = "voxer_ui"
        private const val KEY_SURFACE = "surface_hex"
        private const val KEY_MODE = "resolved_mode"
    }
}
