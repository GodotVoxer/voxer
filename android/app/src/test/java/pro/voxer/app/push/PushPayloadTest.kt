package pro.voxer.app.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PushPayloadTest {

    private fun valid(vararg over: Pair<String, String>): Map<String, String> =
        mapOf(
            "v" to "1",
            "kind" to "comment",
            "channel" to "replies",
            "title" to "Te respondieron",
            "body" to "En «un vox»",
            "path" to "/vox/abc#AB12",
        ) + over

    @Test
    fun `reads a valid payload`() {
        val p = PushPayload.parse(valid())!!
        assertEquals("Te respondieron", p.title)
        assertEquals("/vox/abc#AB12", p.path)
        assertEquals(NotificationChannels.REPLIES, p.channelId)
        assertNull(p.thumbnailUrl)
    }

    @Test
    fun `sends reports to the staff channel`() {
        val p = PushPayload.parse(
            valid(
                "kind" to "report",
                "channel" to "reports",
                "path" to "/vox/abc?denuncia=push#AB12",
            ),
        )!!
        assertEquals(NotificationChannels.REPORTS, p.channelId)
        assertEquals(PushPayload.GROUP_REPORTS, p.group)
    }

    @Test
    fun `ignores a future contract version`() {
        assertNull(PushPayload.parse(valid("v" to "2")))
        assertNull(PushPayload.parse(valid("v" to "")))
        assertNull(PushPayload.parse(emptyMap()))
    }

    @Test
    fun `drops incomplete payloads`() {
        for (key in listOf("title", "body", "path", "kind")) {
            assertNull(key, PushPayload.parse(valid(key to "")))
        }
    }

    @Test
    fun `separates replies from comments and keeps the fallback`() {
        assertEquals(
            NotificationChannels.REPLIES,
            PushPayload.parse(valid("channel" to "replies"))!!.channelId,
        )
        assertEquals(
            NotificationChannels.COMMENTS,
            PushPayload.parse(valid("channel" to "comments"))!!.channelId,
        )
        val p = PushPayload.parse(valid("channel" to "inventado"))!!
        assertEquals(NotificationChannels.COMMENTS, p.channelId)
    }

    @Test
    fun `rejects a path pointing off the domain`() {
        assertNull(PushPayload.parse(valid("path" to "https://evil.com")))
        assertNull(PushPayload.parse(valid("path" to "//evil.com")))
    }

    @Test
    fun `accepts https thumbnails only`() {
        assertEquals(
            "https://storage.voxer.pro/a.webp",
            PushPayload.parse(valid("thumbnailUrl" to "https://storage.voxer.pro/a.webp"))!!.thumbnailUrl,
        )
        assertNull(PushPayload.parse(valid("thumbnailUrl" to "http://inseguro/a.webp"))!!.thumbnailUrl)
    }

    @Test
    fun `the id is stable per thread and differs between vox`() {
        val a = PushPayload.parse(valid())!!
        val b = PushPayload.parse(valid())!!
        val otro = PushPayload.parse(valid("path" to "/vox/zzz"))!!
        assertEquals(a.stableId, b.stableId)
        assertNotEquals(a.stableId, otro.stableId)
        val otroCanal = PushPayload.parse(valid("channel" to "comments"))!!
        assertNotEquals(a.stableId, otroCanal.stableId)
    }

    @Test
    fun `comments on the same vox share one row`() {
        val primero = PushPayload.parse(valid("path" to "/vox/abc#AB12"))!!
        val segundo = PushPayload.parse(valid("path" to "/vox/abc#CD34"))!!
        assertEquals(primero.stableId, segundo.stableId)
        assertEquals(primero.group, segundo.group)
    }

    @Test
    fun `uses the server grouping key when valid`() {
        val p = PushPayload.parse(valid("collapseKey" to "replies:vox:abc"))!!
        assertEquals("replies:vox:abc", p.threadKey)
        val inventada = PushPayload.parse(valid("collapseKey" to "cualquier cosa"))!!
        assertEquals("${NotificationChannels.REPLIES}:/vox/abc", inventada.threadKey)
    }

    @Test
    fun `reports stay separate per item`() {
        val a = PushPayload.parse(
            valid("kind" to "report", "channel" to "reports", "path" to "/vox/abc?denuncia=push#AB12"),
        )!!
        val b = PushPayload.parse(
            valid("kind" to "report", "channel" to "reports", "path" to "/vox/abc?denuncia=push#CD34"),
        )!!
        assertNotEquals(a.stableId, b.stableId)
    }

    @Test
    fun `the group summary is one per channel and overwrites no row`() {
        val a = PushPayload.parse(valid("path" to "/vox/abc"))!!
        val b = PushPayload.parse(valid("path" to "/vox/zzz"))!!
        assertEquals(a.group, b.group)
        assertEquals(a.summaryId, b.summaryId)
        assertNotEquals(a.summaryId, a.stableId)
        val otroCanal = PushPayload.parse(valid("channel" to "comments"))!!
        assertNotEquals(a.summaryId, otroCanal.summaryId)
    }
}
