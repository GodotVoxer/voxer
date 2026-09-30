package pro.voxer.app.web

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PickedFileNameTest {

    @Test
    fun `keeps the provider's name and extension`() {
        assertEquals("IMG_2043.jpg", PickedFileName.sanitize("IMG_2043.jpg", "jpeg"))
        assertEquals("foto.final.png", PickedFileName.sanitize("foto.final.png", "png"))
    }

    @Test
    fun `adds the MIME extension when the name has none`() {
        assertEquals("IMG_2043.jpg", PickedFileName.sanitize("IMG_2043", "jpg"))
        assertEquals("captura.webp", PickedFileName.sanitize("captura", ".WEBP"))
    }

    @Test
    fun `a dot that does not separate an extension does not count`() {
        assertEquals("v1.2.jpg", PickedFileName.sanitize("v1.2", "jpg"))
    }

    @Test
    fun `without name or MIME a usable name remains`() {
        assertEquals("archivo", PickedFileName.sanitize(null, null))
        assertEquals("archivo.mp4", PickedFileName.sanitize("   ", "mp4"))
    }

    @Test
    fun `leaves no path separators or hidden names`() {
        assertEquals("_etc_passwd", PickedFileName.sanitize("/etc/passwd", null))
        assertEquals("_foto.png", PickedFileName.sanitize("../foto.png", null))
        assertEquals("oculto.jpg", PickedFileName.sanitize(".oculto.jpg", null))
    }

    @Test
    fun `a very long name is truncated but keeps its extension`() {
        val result = PickedFileName.sanitize("a".repeat(300) + ".jpg", null)
        assertTrue(result.endsWith(".jpg"))
        assertEquals(104, result.length)
    }
}
