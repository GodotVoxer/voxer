package pro.voxer.app.web

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WebViewVersionGateTest {

    private val modern =
        "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Version/4.0 Chrome/120.0.6099.43 Mobile Safari/537.36"
    private val old =
        "Mozilla/5.0 (Linux; Android 10; SM-A105M) AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36"

    @Test
    fun `reads the chromium major version`() {
        assertEquals(120, WebViewVersionGate.chromiumMajor(modern))
        assertEquals(95, WebViewVersionGate.chromiumMajor(old))
        assertNull(WebViewVersionGate.chromiumMajor("sin version"))
    }

    @Test
    fun `blocks below oklch support`() {
        assertTrue(WebViewVersionGate.isSupported(modern))
        assertFalse(WebViewVersionGate.isSupported(old))
    }

    @Test
    fun `the exact boundary is 111`() {
        val at = modern.replace("Chrome/120", "Chrome/111")
        val below = modern.replace("Chrome/120", "Chrome/110")
        assertTrue(WebViewVersionGate.isSupported(at))
        assertFalse(WebViewVersionGate.isSupported(below))
    }

    @Test
    fun `assumes supported for an unreadable UA`() {
        assertTrue(WebViewVersionGate.isSupported(""))
        assertTrue(WebViewVersionGate.isSupported("algo raro sin Chrome"))
    }
}
