package pro.voxer.app.push

import android.net.Uri

object DeepLinkResolver {

    /**
     * Turns the push's relative `path` into an absolute URL of this site. The result is validated
     * instead of concatenated blindly, so a tampered payload cannot send the app to another domain:
     * anything that is not a path starting with a single slash is rejected.
     */
    fun absolute(path: String, siteUrl: String): String? {
        if (!isSafeRelativePath(path)) return null
        return siteUrl.trimEnd('/') + path
    }

    /** The reverse: from an incoming App Link to the path handed to the Next router. */
    fun relative(uri: Uri, siteUrl: String): String? {
        val site = Uri.parse(siteUrl)
        if (!uri.scheme.equals("https", ignoreCase = true)) return null
        if (!uri.host.equals(site.host, ignoreCase = true)) return null
        val path = uri.path.orEmpty().ifEmpty { "/" }
        val query = uri.query?.let { "?$it" }.orEmpty()
        val fragment = uri.fragment?.let { "#$it" }.orEmpty()
        val full = path + query + fragment
        return if (isSafeRelativePath(full)) full else null
    }

    fun isSafeRelativePath(path: String): Boolean {
        if (path.isEmpty()) return false
        if (!path.startsWith("/")) return false
        // "//host" is a protocol-relative URL: it would leave the domain.
        if (path.startsWith("//")) return false
        if (path.contains("\\")) return false
        if (path.contains("..")) return false
        // A path cannot carry its own scheme.
        if (path.contains(":")) return false
        return path.none { it == '\n' || it == '\r' || it.code < 0x20 }
    }
}
