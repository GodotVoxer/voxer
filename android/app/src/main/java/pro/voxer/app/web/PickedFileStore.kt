package pro.voxer.app.web

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import pro.voxer.app.BuildConfig
import java.io.File
import java.io.InputStream
import java.io.OutputStream
import java.util.concurrent.TimeUnit

/**
 * Copies what the picker returned to app storage and hands out URIs of our FileProvider.
 *
 * This is what makes a cloud-only photo work: opening an `InputStream` on a Google Photos or Drive URI
 * forces the provider to materialize (download) it, while the WebView reading that URI directly fails
 * with `NotReadableError`. It also stops URI permission expiry from mattering between picking and
 * publishing. Chrome makes the same copy before handing the file to the renderer; a WebView has to do
 * it by hand.
 *
 * On any failure it returns the original URI rather than nothing, so the site shows its own message
 * instead of the picker seeming to do nothing.
 */
class PickedFileStore(private val context: Context) {

    /**
     * How much we are willing to download and duplicate in the cache. **Not** the site's upload limit:
     * above this the file goes through uncopied and the web reports it is too large, a far more useful
     * message than a picker that does nothing.
     */
    private val maxCopyBytes = 32L * 1024 * 1024

    private val maxAgeMs = TimeUnit.DAYS.toMillis(1)

    private fun dir(): File = File(context.cacheDir, "picked").apply { mkdirs() }

    /**
     * Deletes old copies. Deliberately not everything on every pick: an attachment picked earlier may
     * still be referenced by an unpublished draft elsewhere on the page.
     */
    fun pruneOld(now: Long = System.currentTimeMillis()) {
        dir().listFiles()?.forEach { if (now - it.lastModified() > maxAgeMs) it.delete() }
    }

    /** Blocking: does I/O and, for a cloud file, network. Never on the main thread. */
    fun materialize(uri: Uri): Uri {
        val resolver = context.contentResolver
        val declaredSize = sizeOf(uri)
        if (declaredSize != null && declaredSize > maxCopyBytes) return uri

        val name = PickedFileName.sanitize(
            displayName = displayNameOf(uri),
            fallbackExtension = extensionFromMime(resolver.getType(uri)),
        )
        val target = File(dir(), "${System.nanoTime()}_$name")
        val copied = runCatching {
            resolver.openInputStream(uri).use { input ->
                if (input == null) return@runCatching null
                target.outputStream().use { output -> copyCapped(input, output) }
            }
        }.getOrNull()

        if (copied == null) {
            target.delete()
            return uri
        }
        return FileProvider.getUriForFile(
            context,
            "${BuildConfig.APPLICATION_ID}.fileprovider",
            target,
        )
    }

    /** `null` if over the cap, so the cache is not filled with something the site will reject. */
    private fun copyCapped(input: InputStream, output: OutputStream): Long? {
        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
        var total = 0L
        while (true) {
            val read = input.read(buffer)
            if (read < 0) return total
            total += read
            if (total > maxCopyBytes) return null
            output.write(buffer, 0, read)
        }
    }

    private fun displayNameOf(uri: Uri): String? = queryFirst(uri, OpenableColumns.DISPLAY_NAME) {
        it.getString(0)
    }

    private fun sizeOf(uri: Uri): Long? = queryFirst(uri, OpenableColumns.SIZE) { it.getLong(0) }

    private fun <T> queryFirst(uri: Uri, column: String, read: (android.database.Cursor) -> T): T? =
        runCatching {
            context.contentResolver.query(uri, arrayOf(column), null, null, null)?.use { cursor ->
                if (cursor.moveToFirst() && !cursor.isNull(0)) read(cursor) else null
            }
        }.getOrNull()

    private fun extensionFromMime(mime: String?): String? =
        mime?.let { MimeTypeMap.getSingleton().getExtensionFromMimeType(it) }
}
