package pro.voxer.app.web

/**
 * Name of the local copy of a picked file. It matters more than it seems: FileProvider derives the
 * `DISPLAY_NAME` and the MIME the WebView sees from it, and the web uses the extension to decide the
 * upload type.
 */
object PickedFileName {

    private const val MAX_BASE_LENGTH = 100
    private const val MAX_EXTENSION_LENGTH = 5
    private const val FALLBACK = "archivo"

    /**
     * @param displayName as reported by the provider; may be null, empty or without an extension.
     * @param fallbackExtension extension derived from the MIME (no dot), for names without one.
     */
    fun sanitize(displayName: String?, fallbackExtension: String?): String {
        val cleaned = displayName.orEmpty()
            .replace('\\', '_')
            .replace('/', '_')
            .filter { it.code >= 0x20 }
            .trim()
            .trimStart('.')

        val dot = cleaned.lastIndexOf('.')
        val ownExtension = if (dot > 0) cleaned.substring(dot + 1).takeIf(::isExtension) else null
        val base = (if (ownExtension != null) cleaned.substring(0, dot) else cleaned)
            .ifBlank { FALLBACK }
            // Truncate the base, not the whole name: otherwise a very long name lost its extension and with
            // it the MIME FileProvider derives.
            .take(MAX_BASE_LENGTH)

        val extension = ownExtension ?: normalizeExtension(fallbackExtension)
        return if (extension == null) base else "$base.$extension"
    }

    private fun normalizeExtension(raw: String?): String? =
        raw?.trim()?.trimStart('.')?.lowercase()?.filter { it.isLetterOrDigit() }?.takeIf(::isExtension)

    /** Requires at least one letter, so the `.2` of "v1.2" is not taken for an extension. */
    private fun isExtension(candidate: String): Boolean =
        candidate.isNotEmpty() &&
            candidate.length <= MAX_EXTENSION_LENGTH &&
            candidate.all { it.isLetterOrDigit() } &&
            candidate.any { it.isLetter() }
}
