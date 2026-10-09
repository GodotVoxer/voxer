package pro.voxer.app.push

/** Contract with `server/push/payload.ts`. If the version goes up, older apps ignore the message. */
data class PushPayload(
    val kind: String,
    val channelId: String,
    val title: String,
    val body: String,
    /** Full text for the expanded row; older backends do not send it. */
    val expandedBody: String?,
    val path: String,
    val thumbnailUrl: String?,
    /** Server grouping key (`replies:vox:<id>`); comments on the same vox share one row. */
    val threadKey: String,
) {
    /**
     * Comments: a single row per vox and channel, updated with each new comment (so the vox image shows
     * once). Reports: one row per reported item.
     */
    val stableId: Int get() = if (kind == "report") "$channelId:$path".hashCode() else threadKey.hashCode()

    /**
     * One group per channel, always with its own summary (see `PushNotifier`). The system
     * regroups a group without a summary under one of its own, and tapping that opens the app without a
     * deep link.
     */
    val group: String get() = if (kind == "report") GROUP_REPORTS else channelId
    val summaryId: Int get() = "summary:$group".hashCode()

    /** Stored on the row so the page can clear it once that vox is open (`VoxNotificationCleanup`). */
    val voxId: String? get() = VOX_PATH_RE.find(path)?.groupValues?.get(1)

    companion object {
        const val SUPPORTED_VERSION = "1"
        const val GROUP_REPORTS = "reports"

        private val COLLAPSE_KEY_RE = Regex("^[a-z]+:vox:[A-Za-z0-9_-]{1,64}$")
        private val VOX_PATH_RE = Regex("^/vox/([A-Za-z0-9_-]{1,64})(?:[?#]|$)")

        fun parse(data: Map<String, String>): PushPayload? {
            if (data["v"] != SUPPORTED_VERSION) return null
            val title = data["title"]?.takeIf { it.isNotBlank() } ?: return null
            val body = data["body"]?.takeIf { it.isNotBlank() } ?: return null
            val path = data["path"]?.takeIf { DeepLinkResolver.isSafeRelativePath(it) } ?: return null
            val kind = data["kind"]?.takeIf { it.isNotBlank() } ?: return null
            // Compatibility: a new app may still receive `activity` from an older backend.
            val channelId = when (data["channel"]) {
                "reports" -> NotificationChannels.REPORTS
                "replies" -> NotificationChannels.REPLIES
                else -> NotificationChannels.COMMENTS
            }
            // An older backend does not send the key: the vox comes from the path without anchor or query.
            val threadKey = data["collapseKey"]?.takeIf { COLLAPSE_KEY_RE.matches(it) }
                ?: "$channelId:${path.substringBefore('#').substringBefore('?')}"
            return PushPayload(
                kind = kind,
                channelId = channelId,
                title = title,
                body = body,
                expandedBody = data["expandedBody"]?.takeIf { it.isNotBlank() },
                path = path,
                thumbnailUrl = data["thumbnailUrl"]?.takeIf { it.startsWith("https://") },
                threadKey = threadKey,
            )
        }
    }
}
