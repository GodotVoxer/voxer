package pro.voxer.app.web

import android.app.DownloadManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import android.webkit.CookieManager
import android.webkit.URLUtil
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import pro.voxer.app.R

/**
 * The WebView has no Chrome context menu: without this there is no "save image" or "copy link".
 * DownloadManager does not understand `blob:` downloads (exporting a theme in ThemeTransferActions);
 * that case goes through the bridge instead.
 */
class DownloadController(private val context: Context) {

    fun enqueue(url: String, userAgent: String, contentDisposition: String?, mimeType: String?) {
        if (!url.startsWith("https://")) {
            Toast.makeText(context, R.string.download_failed, Toast.LENGTH_SHORT).show()
            return
        }
        runCatching {
            val fileName = URLUtil.guessFileName(url, contentDisposition, mimeType)
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setMimeType(mimeType)
                addRequestHeader("User-Agent", userAgent)
                CookieManager.getInstance().getCookie(url)?.let { addRequestHeader("Cookie", it) }
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
            }
            val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            manager.enqueue(request)
            Toast.makeText(context, R.string.download_started, Toast.LENGTH_SHORT).show()
        }.onFailure {
            Toast.makeText(context, R.string.download_failed, Toast.LENGTH_SHORT).show()
        }
    }

    fun showImageMenu(imageUrl: String, userAgent: String, onShare: (String) -> Unit) =
        showMediaMenu(R.string.action_save_image, imageUrl, userAgent, onShare)

    fun showVideoMenu(videoUrl: String, userAgent: String, onShare: (String) -> Unit) =
        showMediaMenu(R.string.action_save_video, videoUrl, userAgent, onShare)

    private fun showMediaMenu(saveLabel: Int, url: String, userAgent: String, onShare: (String) -> Unit) {
        val options = arrayOf(
            context.getString(saveLabel),
            context.getString(R.string.action_copy_link),
            context.getString(R.string.action_share),
        )
        AlertDialog.Builder(context)
            .setItems(options) { _, which ->
                when (which) {
                    0 -> enqueue(url, userAgent, null, null)
                    1 -> copyToClipboard(url)
                    2 -> onShare(url)
                }
            }
            .show()
    }

    fun copyToClipboard(text: String) {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText("Voxer", text))
        Toast.makeText(context, R.string.link_copied, Toast.LENGTH_SHORT).show()
    }
}
