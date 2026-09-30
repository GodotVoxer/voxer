package pro.voxer.app.web

import org.junit.Assert.assertEquals
import org.junit.Test

class FileChooserAcceptTest {

    @Test
    fun `the vox accept allows photo and video`() {
        val accept = FileChooserAcceptParser.parse(arrayOf("image/*", "video/*"))
        assertEquals(FileChooserAccept(image = true, video = true), accept)
    }

    @Test
    fun `without accept anything is allowed`() {
        assertEquals(FileChooserAccept(true, true), FileChooserAcceptParser.parse(null))
        assertEquals(FileChooserAccept(true, true), FileChooserAcceptParser.parse(emptyArray()))
        assertEquals(FileChooserAccept(true, true), FileChooserAcceptParser.parse(arrayOf("  ")))
        assertEquals(FileChooserAccept(true, true), FileChooserAcceptParser.parse(arrayOf("*/*")))
    }

    @Test
    fun `importing a json theme offers no camera`() {
        val accept = FileChooserAcceptParser.parse(arrayOf("application/json", ".json"))
        assertEquals(FileChooserAccept(image = false, video = false), accept)
        assertEquals(false, accept.anyMedia)
    }

    @Test
    fun `image-only and video-only are told apart`() {
        assertEquals(
            FileChooserAccept(image = true, video = false),
            FileChooserAcceptParser.parse(arrayOf("image/png", "image/jpeg")),
        )
        assertEquals(
            FileChooserAccept(image = false, video = true),
            FileChooserAcceptParser.parse(arrayOf("video/mp4")),
        )
    }

    @Test
    fun `ignores case and spaces`() {
        assertEquals(
            FileChooserAccept(image = true, video = false),
            FileChooserAcceptParser.parse(arrayOf(" IMAGE/PNG ")),
        )
    }

    @Test
    fun `mimeTypes keeps types and drops extensions`() {
        assertEquals(
            listOf("image/*", "video/*"),
            FileChooserAcceptParser.mimeTypes(arrayOf("image/*", "video/*")),
        )
        assertEquals(
            listOf("image/png"),
            FileChooserAcceptParser.mimeTypes(arrayOf(" image/png ", ".jpg", "")),
        )
    }

    @Test
    fun `mimeTypes without valid entries is empty`() {
        assertEquals(emptyList<String>(), FileChooserAcceptParser.mimeTypes(arrayOf(".mp4", ".webm")))
        assertEquals(emptyList<String>(), FileChooserAcceptParser.mimeTypes(null))
    }
}
