package pro.voxer.app.web

/** What an `<input type="file">` accepts, to decide what to offer besides the file picker. */
data class FileChooserAccept(val image: Boolean, val video: Boolean) {
    val anyMedia: Boolean get() = image || video
}

object FileChooserAcceptParser {

    /**
     * The `accept` entries that are MIME types, to declare in `EXTRA_MIME_TYPES`. Extension entries
     * (`.mp4`) are dropped: they are not valid there.
     */
    fun mimeTypes(acceptTypes: Array<String>?): List<String> =
        acceptTypes.orEmpty()
            .map { it.trim() }
            .filter { it.isNotEmpty() && it.contains('/') }
            .distinct()

    /**
     * An empty or wildcard `accept` takes anything, so both cameras are offered. A list with only
     * non-media types (`application/json` when importing a theme) offers none.
     */
    fun parse(acceptTypes: Array<String>?): FileChooserAccept {
        val types = acceptTypes.orEmpty()
            .map { it.trim().lowercase() }
            .filter { it.isNotEmpty() }
        if (types.isEmpty() || types.any { it == "*/*" || it == "*" }) {
            return FileChooserAccept(image = true, video = true)
        }
        return FileChooserAccept(
            image = types.any { it.startsWith("image/") },
            video = types.any { it.startsWith("video/") },
        )
    }
}
