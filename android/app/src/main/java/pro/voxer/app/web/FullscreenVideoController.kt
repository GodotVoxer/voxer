package pro.voxer.app.web

import android.app.Activity
import android.content.pm.ActivityInfo
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * `LazyNativeVideo` uses `playsInline`, so video starts embedded; but the controls' fullscreen button
 * calls `requestFullscreen()`, which does **nothing** in a WebView unless `onShowCustomView` /
 * `onHideCustomView` are implemented.
 */
class FullscreenVideoController(
    private val activity: Activity,
    private val container: ViewGroup,
    private val webView: WebView,
) {

    private var customView: View? = null
    private var callback: WebChromeClient.CustomViewCallback? = null
    private var previousOrientation: Int = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED

    val isActive: Boolean get() = customView != null

    fun enter(view: View, cb: WebChromeClient.CustomViewCallback) {
        if (customView != null) {
            cb.onCustomViewHidden()
            return
        }
        customView = view
        callback = cb
        previousOrientation = activity.requestedOrientation

        container.addView(
            view,
            ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            ),
        )
        container.visibility = View.VISIBLE
        systemBars(visible = false)

        webView.evaluateJavascript(FULLSCREEN_VIDEO_DIMENSIONS_SCRIPT) { rawDimensions ->
            if (customView === view) {
                activity.requestedOrientation = fullscreenVideoOrientation(rawDimensions)
            }
        }
    }

    fun exit() {
        val view = customView ?: return
        container.removeView(view)
        container.visibility = View.GONE
        customView = null
        callback?.onCustomViewHidden()
        callback = null
        activity.requestedOrientation = previousOrientation
        systemBars(visible = true)
    }

    private fun systemBars(visible: Boolean) {
        val controller = WindowInsetsControllerCompat(activity.window, activity.window.decorView)
        if (visible) controller.show(WindowInsetsCompat.Type.systemBars())
        else controller.hide(WindowInsetsCompat.Type.systemBars())
    }
}
