package pro.voxer.app.web

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MainFrameHttpErrorTest {

    @Test
    fun `a 5xx navigation is a server failure`() {
        assertTrue(MainFrameHttpError.isServerFailure(502, emptyMap(), emptyMap()))
        assertTrue(MainFrameHttpError.isServerFailure(503, mapOf("Accept" to "text/html"), emptyMap()))
    }

    @Test
    fun `client errors never blank the app`() {
        assertFalse(MainFrameHttpError.isServerFailure(404, emptyMap(), emptyMap()))
    }

    @Test
    fun `a prefetch Cloudflare refused is ignored`() {
        assertFalse(
            MainFrameHttpError.isServerFailure(
                503,
                emptyMap(),
                mapOf("Cf-Speculation-Refused" to "prefetch refused: not eligible"),
            ),
        )
    }

    @Test
    fun `any failed prefetch is ignored`() {
        assertFalse(MainFrameHttpError.isServerFailure(503, mapOf("Sec-Purpose" to "prefetch"), emptyMap()))
        assertFalse(MainFrameHttpError.isServerFailure(500, mapOf("purpose" to "prefetch"), emptyMap()))
    }
}
