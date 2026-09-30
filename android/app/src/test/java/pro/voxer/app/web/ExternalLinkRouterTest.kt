package pro.voxer.app.web

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ExternalLinkRouterTest {

    private val site = "www.voxer.pro"

    private fun decide(
        scheme: String?,
        host: String?,
        url: String,
        isMainFrame: Boolean = true,
        hasGesture: Boolean = true,
    ) = ExternalLinkRouter.decide(scheme, host, url, isMainFrame, hasGesture, site)

    @Test
    fun `site links load inside`() {
        assertEquals(
            LinkDecision.LoadInWebView,
            decide("https", "www.voxer.pro", "https://www.voxer.pro/vox/abc"),
        )
    }

    @Test
    fun `host comparison is case-insensitive`() {
        assertEquals(
            LinkDecision.LoadInWebView,
            decide("HTTPS", "WWW.VOXER.PRO", "https://WWW.VOXER.PRO/"),
        )
    }

    @Test
    fun `never intercepts subframes so the YouTube embed keeps working`() {
        assertEquals(
            LinkDecision.LoadInWebView,
            decide("https", "www.youtube.com", "https://www.youtube.com/embed/x", isMainFrame = false),
        )
    }

    @Test
    fun `opens system app schemes externally`() {
        for ((scheme, url) in listOf(
            "mailto" to "mailto:hola@voxer.pro",
            "tel" to "tel:+541100000000",
            "sms" to "sms:+541100000000",
            "geo" to "geo:0,0?q=obelisco",
        )) {
            val d = decide(scheme, null, url, hasGesture = false)
            assertTrue(url, d is LinkDecision.OpenExternally)
        }
    }

    @Test
    fun `the intent scheme takes its own branch`() {
        val raw = "intent://www.youtube.com/watch?v=x#Intent;scheme=https;package=com.google.android.youtube;end"
        assertEquals(LinkDecision.OpenIntentScheme(raw), decide("intent", "www.youtube.com", raw))
    }

    @Test
    fun `an external link with a user gesture opens externally`() {
        assertEquals(
            LinkDecision.OpenExternally("https://es.wikipedia.org/wiki/Vox"),
            decide("https", "es.wikipedia.org", "https://es.wikipedia.org/wiki/Vox"),
        )
    }

    @Test
    fun `a redirect to another host without a gesture is blocked`() {
        assertEquals(
            LinkDecision.Block,
            decide("https", "evil.com", "https://evil.com/x", hasGesture = false),
        )
    }

    @Test
    fun `blocks dangerous schemes even with a gesture`() {
        assertEquals(LinkDecision.Block, decide("javascript", null, "javascript:alert(1)"))
        assertEquals(LinkDecision.Block, decide("file", null, "file:///etc/passwd"))
        assertEquals(LinkDecision.Block, decide("data", null, "data:text/html,<script>"))
        assertEquals(LinkDecision.Block, decide("content", null, "content://algo"))
        assertEquals(LinkDecision.Block, decide(null, null, "sin-esquema"))
    }

    @Test
    fun `plain http to the own host is not internal`() {
        // The site forces HTTPS (HSTS + upgrade-insecure-requests); a plain http:// is suspicious.
        assertEquals(
            LinkDecision.OpenExternally("http://www.voxer.pro/"),
            decide("http", "www.voxer.pro", "http://www.voxer.pro/"),
        )
    }

    @Test
    fun `a trusted host loads inside even as a redirect`() {
        val sso = "team.cloudflareaccess.com"
        val trusted = ExternalLinkRouter.parseHosts(" Team.cloudflareaccess.com , ")
        assertEquals(
            LinkDecision.LoadInWebView,
            ExternalLinkRouter.decide("https", sso, "https://$sso/login", true, false, "www.voxer.pro", trusted),
        )
        assertEquals(
            LinkDecision.Block,
            ExternalLinkRouter.decide("https", sso, "https://$sso/login", true, false, "www.voxer.pro"),
        )
        assertEquals(
            LinkDecision.Block,
            ExternalLinkRouter.decide("http", sso, "http://$sso/login", true, false, "www.voxer.pro", trusted),
        )
    }
}
