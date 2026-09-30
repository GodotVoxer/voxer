package pro.voxer.app.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DeepLinkResolverTest {

    private val site = "https://www.voxer.pro"

    @Test
    fun `builds the absolute url of a vox`() {
        assertEquals("https://www.voxer.pro/vox/abc#TAG1", DeepLinkResolver.absolute("/vox/abc#TAG1", site))
        assertEquals(
            "https://www.voxer.pro/vox/abc?denuncia=push#TAG1",
            DeepLinkResolver.absolute("/vox/abc?denuncia=push#TAG1", site),
        )
    }

    @Test
    fun `tolerates a trailing slash in the origin`() {
        assertEquals("https://www.voxer.pro/vox/abc", DeepLinkResolver.absolute("/vox/abc", "https://www.voxer.pro/"))
    }

    @Test
    fun `a tampered payload cannot take the app off the domain`() {
        assertNull(DeepLinkResolver.absolute("https://evil.com/x", site))
        assertNull(DeepLinkResolver.absolute("//evil.com/x", site))
        assertNull(DeepLinkResolver.absolute("javascript:alert(1)", site))
        assertNull(DeepLinkResolver.absolute("intent://evil#Intent;end", site))
        assertNull(DeepLinkResolver.absolute("/../../etc/passwd", site))
        assertNull(DeepLinkResolver.absolute("vox/abc", site))
        assertNull(DeepLinkResolver.absolute("", site))
    }

    @Test
    fun `rejects line breaks and control characters`() {
        assertFalse(DeepLinkResolver.isSafeRelativePath("/vox/a\nb"))
        assertFalse(DeepLinkResolver.isSafeRelativePath("/vox/a\u0000b"))
        assertFalse(DeepLinkResolver.isSafeRelativePath("/vox\\a"))
    }

    @Test
    fun `accepts valid site paths`() {
        for (path in listOf("/", "/vox/abc", "/vox/abc#AB12", "/buscar?q=hola", "/NSFW", "/moderacion")) {
            assertTrue(path, DeepLinkResolver.isSafeRelativePath(path))
        }
    }
}
