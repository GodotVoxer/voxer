package pro.voxer.app.push

import org.junit.Assert.assertEquals
import org.junit.Test

class VoxNotificationCleanupTest {

    private fun row(id: Int, group: String, voxId: String?) = ShownNotification(id, group, false, voxId)
    private fun summary(id: Int, group: String) = ShownNotification(id, group, true, null)

    @Test
    fun `cancels the rows of the vox and keeps the others`() {
        val shown = listOf(
            row(1, "comments", "abc"),
            row(2, "comments", "xyz"),
            row(3, "reports", "abc"),
            summary(10, "comments"),
            summary(11, "reports"),
        )
        assertEquals(listOf(1, 3, 11), VoxNotificationCleanup.idsToCancel(shown, "abc"))
    }

    @Test
    fun `drops the summary when its group is left empty`() {
        val shown = listOf(row(1, "replies", "abc"), summary(10, "replies"))
        assertEquals(listOf(1, 10), VoxNotificationCleanup.idsToCancel(shown, "abc"))
    }

    @Test
    fun `finds rows posted before the vox id was stored by their collapse key`() {
        val legacy = "replies:vox:abc".hashCode()
        val shown = listOf(row(legacy, "replies", null), row(7, "replies", null), summary(10, "replies"))
        assertEquals(listOf(legacy), VoxNotificationCleanup.idsToCancel(shown, "abc"))
    }

    @Test
    fun `does nothing when the vox has no rows`() {
        val shown = listOf(row(1, "comments", "xyz"), summary(10, "comments"))
        assertEquals(emptyList<Int>(), VoxNotificationCleanup.idsToCancel(shown, "abc"))
    }

    @Test
    fun `accepts only vox ids shaped like the site ones`() {
        assertEquals(true, VoxNotificationCleanup.VOX_ID.matches("a1_B-2"))
        assertEquals(false, VoxNotificationCleanup.VOX_ID.matches("../x"))
        assertEquals(false, VoxNotificationCleanup.VOX_ID.matches(""))
    }
}
