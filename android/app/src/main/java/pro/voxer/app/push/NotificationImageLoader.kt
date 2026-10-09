package pro.voxer.app.push

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.core.graphics.scale
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.min

/**
 * Downloads the vox thumbnail for the notification. `onMessageReceived` already runs on a background
 * thread with a few seconds of margin, so a bounded synchronous download is enough: if it is slow or
 * fails, the notification goes out without an image.
 */
object NotificationImageLoader {

    private const val TIMEOUT_MS = 4_000
    private const val MAX_BYTES = 3 * 1024 * 1024
    private const val MAX_SOURCE_PIXELS = 40_000_000L
    private const val LARGE_ICON_PX = 256

    /** Consecutive comments on the same vox ask for the same image: the last one is kept. */
    @Volatile
    private var last: Pair<String, Bitmap>? = null

    fun load(url: String): Bitmap? {
        last?.let { (cachedUrl, icon) -> if (cachedUrl == url) return icon }
        val icon = try {
            download(url)?.let(::decode)
        } catch (_: Exception) {
            null
        } ?: return null
        last = url to icon
        return icon
    }

    private fun download(url: String): ByteArray? {
        val conn = URL(url).openConnection() as HttpURLConnection
        return try {
            conn.connectTimeout = TIMEOUT_MS
            conn.readTimeout = TIMEOUT_MS
            if (conn.responseCode != HttpURLConnection.HTTP_OK) return null
            conn.inputStream.use(::readCapped)
        } finally {
            conn.disconnect()
        }
    }

    private fun readCapped(input: InputStream): ByteArray? {
        val out = ByteArrayOutputStream()
        val buffer = ByteArray(16 * 1024)
        while (true) {
            val n = input.read(buffer)
            if (n < 0) break
            out.write(buffer, 0, n)
            if (out.size() > MAX_BYTES) return null
        }
        return out.toByteArray()
    }

    private fun decode(bytes: ByteArray): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        val w = bounds.outWidth
        val h = bounds.outHeight
        if (w <= 0 || h <= 0 || w.toLong() * h > MAX_SOURCE_PIXELS) return null

        var sample = 1
        while (w / (sample * 2) >= LARGE_ICON_PX && h / (sample * 2) >= LARGE_ICON_PX) sample *= 2
        val bitmap = BitmapFactory.decodeByteArray(
            bytes,
            0,
            bytes.size,
            BitmapFactory.Options().apply { inSampleSize = sample },
        ) ?: return null
        return centerSquare(bitmap, LARGE_ICON_PX)
    }

    /** The large icon is shown square: center crop so the thumbnail is not distorted. */
    private fun centerSquare(src: Bitmap, size: Int): Bitmap {
        val side = min(src.width, src.height)
        val x = (src.width - side) / 2
        val y = (src.height - side) / 2
        val square = Bitmap.createBitmap(src, x, y, side, side)
        return if (side > size) square.scale(size, size) else square
    }
}
