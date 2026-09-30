package pro.voxer.app.web

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import pro.voxer.app.BuildConfig
import pro.voxer.app.R
import java.io.File
import java.util.concurrent.Executors

/**
 * Makes "create a vox with an image/video" and "attach to a comment" work inside the WebView.
 *
 * Uses the standard system chooser: `FileChooserParams.createIntent()` builds the `ACTION_GET_CONTENT`
 * from the input's `accept`, and the chooser lists everything that can provide it (gallery, Files,
 * Drive, other galleries). It does **not** use the Photo Picker (`PickVisualMedia`), which only shows
 * the device gallery: other apps were unreachable, and with a non-media `accept` (importing a theme
 * `.json`) it still opened the gallery.
 *
 * Picked files are not handed to the WebView as is: [PickedFileStore] copies them first, which is what
 * allows uploading a photo that lives only in the cloud.
 *
 * Cameras are initial intents of the chooser and delegate to the camera app through FileProvider, so
 * the manifest does NOT declare `android.permission.CAMERA`: declaring it would require asking at
 * runtime even though the intent does not need it. `ACTION_GET_CONTENT` needs no storage permission.
 */
class FileChooserController(private val activity: ComponentActivity) {

    private var pending: ValueCallback<Array<Uri>>? = null
    /** Camera URIs handed out in this attempt, with their file, to know which one was filled. */
    private var cameraTargets: List<Pair<Uri, File>> = emptyList()
    /** Identifies the current pick: a slow copy must not resolve a later request. */
    private var requestId = 0L

    private val store = PickedFileStore(activity)
    private val mainHandler = Handler(Looper.getMainLooper())
    private val io = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "voxer-picked-files").apply { isDaemon = true }
    }

    private val chooser =
        activity.registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            onChooserResult(resolveResult(result.resultCode, result.data))
        }

    fun onShowFileChooser(
        callback: ValueCallback<Array<Uri>>,
        params: WebChromeClient.FileChooserParams,
    ): Boolean {
        // If one was pending (the user came back without picking) it must be released, or the
        // <input type="file"> stays stuck forever.
        pending?.onReceiveValue(null)
        pending = callback
        cameraTargets = emptyList()
        requestId += 1
        io.execute { store.pruneOld() }

        val accept = FileChooserAcceptParser.parse(params.acceptTypes)

        return runCatching {
            chooser.launch(launchIntent(params, accept))
            true
        }.getOrElse {
            deliver(null)
            false
        }
    }

    /** Cancels whatever is pending when leaving the screen, so the input is not left hanging. */
    fun cancelPending() = deliver(null)

    /**
     * The copy may take a while (cloud download), so it runs off the main thread and the notice only
     * shows if it really takes long: a local file finishes first and nothing is shown.
     */
    private fun onChooserResult(uris: Array<Uri>?) {
        if (uris.isNullOrEmpty()) {
            deliver(uris)
            return
        }
        // What the camera captured is already our own file: nothing to materialize.
        if (uris.all { uri -> cameraTargets.any { it.first == uri } }) {
            deliver(uris)
            return
        }
        val id = requestId
        val slowNotice = Runnable {
            Toast.makeText(activity, R.string.file_chooser_preparing, Toast.LENGTH_SHORT).show()
        }
        mainHandler.postDelayed(slowNotice, SLOW_COPY_NOTICE_MS)
        io.execute {
            val local = Array(uris.size) { store.materialize(uris[it]) }
            activity.runOnUiThread {
                mainHandler.removeCallbacks(slowNotice)
                if (id == requestId) deliver(local)
            }
        }
    }

    /** With `capture` the input asks for the camera directly; otherwise the chooser with the camera inside. */
    private fun launchIntent(
        params: WebChromeClient.FileChooserParams,
        accept: FileChooserAccept,
    ): Intent {
        if (params.isCaptureEnabled && accept.anyMedia) {
            return cameraIntent(video = accept.video && !accept.image)
        }
        val title = params.title?.toString()?.takeIf { it.isNotBlank() }
            ?: activity.getString(R.string.file_chooser_title)
        val chooserIntent = Intent.createChooser(contentIntent(params), title)
        val initial = buildList {
            if (accept.image) add(cameraIntent(video = false))
            if (accept.video) add(cameraIntent(video = true))
        }
        if (initial.isNotEmpty()) {
            chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, initial.toTypedArray())
        }
        return chooserIntent
    }

    /**
     * `FileChooserParams.createIntent()` builds the `type` from **only the first** `accept` and does not
     * declare the rest: an input accepting images and videos asked for images only, and Android sends that
     * `ACTION_GET_CONTENT` to the photo picker in images-only mode. With more than one type, ask for the
     * general wildcard and declare them all in `EXTRA_MIME_TYPES`.
     *
     * Careful when editing: Kotlin nests block comments, so a literal MIME wildcard here opens an inner
     * comment that never closes and swallows the rest of the file.
     */
    private fun contentIntent(params: WebChromeClient.FileChooserParams): Intent {
        val intent = params.createIntent()
        val mimeTypes = FileChooserAcceptParser.mimeTypes(params.acceptTypes)
        if (mimeTypes.size > 1) {
            intent.type = "*/*"
            intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes.toTypedArray())
        }
        return intent
    }

    private fun cameraIntent(video: Boolean): Intent {
        val dir = File(activity.cacheDir, "camera").apply { mkdirs() }
        val file = File.createTempFile(if (video) "cap_" else "img_", if (video) ".mp4" else ".jpg", dir)
        val uri = FileProvider.getUriForFile(activity, "${BuildConfig.APPLICATION_ID}.fileprovider", file)
        cameraTargets = cameraTargets + (uri to file)
        val action = if (video) MediaStore.ACTION_VIDEO_CAPTURE else MediaStore.ACTION_IMAGE_CAPTURE
        return Intent(action)
            .putExtra(MediaStore.EXTRA_OUTPUT, uri)
            .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
    }

    /**
     * The camera writes to the `EXTRA_OUTPUT` we pass and returns no data, so when the standard parsing
     * finds nothing, check which camera file was written.
     */
    private fun resolveResult(resultCode: Int, data: Intent?): Array<Uri>? {
        WebChromeClient.FileChooserParams.parseResult(resultCode, data)?.let { return it }
        if (resultCode != Activity.RESULT_OK) return null
        return cameraTargets.firstOrNull { it.second.length() > 0L }?.let { arrayOf(it.first) }
    }

    private fun deliver(uris: Array<Uri>?) {
        // `null` means cancelled; the callback MUST always be invoked.
        pending?.onReceiveValue(uris)
        pending = null
        val chosen = uris?.toSet().orEmpty()
        for ((uri, file) in cameraTargets) if (uri !in chosen) file.delete()
        cameraTargets = emptyList()
    }

    private companion object {
        const val SLOW_COPY_NOTICE_MS = 400L
    }
}
