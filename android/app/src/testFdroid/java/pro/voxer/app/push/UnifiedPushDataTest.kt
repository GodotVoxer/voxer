package pro.voxer.app.push

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class UnifiedPushDataTest {

    @Test
    fun `the registration carries endpoint and keys for the page`() {
        val json = JSONObject(UnifiedPushData.registrationJson("https://ntfy.example/up123", "P".repeat(87), "A".repeat(22)))
        assertEquals("https://ntfy.example/up123", json.getString("endpoint"))
        assertEquals("P".repeat(87), json.getString("p256dh"))
        assertEquals("A".repeat(22), json.getString("auth"))
    }

    @Test
    fun `a message becomes the same string map as FCM data`() {
        val data = UnifiedPushData.parseMessage("""{"v":"1","title":"Hola","path":"/vox/abc","n":3}""")
        assertEquals(mapOf("v" to "1", "title" to "Hola", "path" to "/vox/abc"), data)
    }

    @Test
    fun `a message that is not a JSON object is dropped`() {
        assertNull(UnifiedPushData.parseMessage("not json"))
        assertNull(UnifiedPushData.parseMessage("[1,2]"))
    }

    @Test
    fun `only an uncompressed base64url P-256 key counts as VAPID`() {
        assertTrue(UnifiedPushData.isVapidPublicKey("B".repeat(87)))
        assertFalse(UnifiedPushData.isVapidPublicKey("B".repeat(86)))
        assertFalse(UnifiedPushData.isVapidPublicKey("B".repeat(86) + "="))
    }
}
