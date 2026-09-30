package pro.voxer.app.push

import android.content.Context
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationManagerCompat
import pro.voxer.app.R

object NotificationChannels {
    const val COMMENTS = "voxer_comments"

    const val REPLIES = "voxer_replies"

    /** Pending reports; only MOD/ADMIN receive them. */
    const val REPORTS = "voxer_reports"

    /**
     * Each kind of activity has its own channel so Android lets users configure them separately.
     * Creating the staff channel is always harmless: a USER never receives reports.
     */
    fun ensure(context: Context) {
        val manager = NotificationManagerCompat.from(context)
        manager.createNotificationChannelsCompat(
            listOf(
                NotificationChannelCompat.Builder(COMMENTS, NotificationManagerCompat.IMPORTANCE_DEFAULT)
                    .setName(context.getString(R.string.channel_comments_name))
                    .setDescription(context.getString(R.string.channel_comments_description))
                    .setShowBadge(true)
                    .build(),
                NotificationChannelCompat.Builder(REPLIES, NotificationManagerCompat.IMPORTANCE_DEFAULT)
                    .setName(context.getString(R.string.channel_replies_name))
                    .setDescription(context.getString(R.string.channel_replies_description))
                    .setShowBadge(true)
                    .build(),
                NotificationChannelCompat.Builder(REPORTS, NotificationManagerCompat.IMPORTANCE_HIGH)
                    .setName(context.getString(R.string.channel_reports_name))
                    .setDescription(context.getString(R.string.channel_reports_description))
                    .setShowBadge(true)
                    .build(),
            ),
        )
        manager.deleteNotificationChannel(LEGACY_ACTIVITY)
    }

    private const val LEGACY_ACTIVITY = "voxer_activity"
}
