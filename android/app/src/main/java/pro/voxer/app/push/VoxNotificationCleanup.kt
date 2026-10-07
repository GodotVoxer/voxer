package pro.voxer.app.push

/** The part of a shown notification the cleanup needs; `StatusBarNotification` cannot be built in unit tests. */
data class ShownNotification(
    val id: Int,
    val group: String?,
    val isSummary: Boolean,
    val voxId: String?,
)

object VoxNotificationCleanup {

    val VOX_ID = Regex("^[A-Za-z0-9_-]{1,64}$")

    /**
     * The vox rows plus each group summary left without rows: an orphan summary stays in the shade and
     * opens the app on whatever vox it pointed to.
     */
    fun idsToCancel(shown: List<ShownNotification>, voxId: String): List<Int> {
        // Rows posted by app versions that did not store the vox id are keyed by the collapse key.
        val legacyIds = setOf("comments:vox:$voxId".hashCode(), "replies:vox:$voxId".hashCode())
        val rows = shown.filter {
            !it.isSummary && (it.voxId == voxId || (it.voxId == null && it.id in legacyIds))
        }
        if (rows.isEmpty()) return emptyList()
        val cancelled = rows.map { it.id }.toSet()
        val emptiedGroups = rows.mapNotNull { it.group }.toSet().filter { group ->
            shown.none { !it.isSummary && it.group == group && it.id !in cancelled }
        }
        val summaries = shown.filter { it.isSummary && it.group in emptiedGroups }.map { it.id }
        return rows.map { it.id } + summaries
    }
}
