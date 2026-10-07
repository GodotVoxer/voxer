package pro.voxer.app.push

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import pro.voxer.app.BuildConfig
import pro.voxer.app.MainActivity
import pro.voxer.app.R

/**
 * Builds the notification row for a push, whichever transport delivered it. The server sends
 * data-only messages, so this also runs with the app in the background and the row is ours: right
 * channel, grouped by vox, controlled text.
 */
object PushNotifier {

    fun show(context: Context, message: Map<String, String>) {
        val payload = PushPayload.parse(message) ?: return
        val deepLink = DeepLinkResolver.absolute(payload.path, BuildConfig.SITE_URL) ?: return

        NotificationChannels.ensure(context)

        val intent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse(deepLink)
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            payload.stableId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val manager = NotificationManagerCompat.from(context)
        // On Android 13+ without POST_NOTIFICATIONS nothing shows: not even worth downloading the image.
        if (!manager.areNotificationsEnabled()) return

        val count = activeCount(context, payload.stableId) + 1
        val images = payload.thumbnailUrl?.let(NotificationImageLoader::load)

        val builder = NotificationCompat.Builder(context, payload.channelId)
            .setSmallIcon(R.drawable.ic_stat_voxer)
            .setColor(ContextCompat.getColor(context, R.color.voxer_brand))
            .setContentTitle(payload.title)
            .setContentText(payload.body)
            .setNumber(count)
            .addExtras(
                Bundle().apply {
                    putInt(EXTRA_COUNT, count)
                    putString(EXTRA_VOX_ID, payload.voxId)
                },
            )
            .setCategory(
                if (payload.kind == "report") {
                    NotificationCompat.CATEGORY_STATUS
                } else {
                    NotificationCompat.CATEGORY_MESSAGE
                },
            )
            .setGroup(payload.group)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)

        if (count > 1) builder.setSubText(context.getString(R.string.notification_new_count, count))
        if (images != null) {
            // Collapsed: thumbnail on the right. Expanded: the large image, without repeating the icon.
            builder
                .setLargeIcon(images.largeIcon)
                .setStyle(
                    NotificationCompat.BigPictureStyle()
                        .bigPicture(images.bigPicture)
                        .bigLargeIcon(null as Bitmap?),
                )
        }

        // Same id for the whole vox: the row is replaced (deep linking to the latest comment) instead of
        // stacking one per comment.
        val summary = NotificationCompat.Builder(context, payload.channelId)
            .setSmallIcon(R.drawable.ic_stat_voxer)
            .setColor(ContextCompat.getColor(context, R.color.voxer_brand))
            .setContentTitle(payload.title)
            .setContentText(payload.body)
            .setGroup(payload.group)
            .setGroupSummary(true)
            // Only the vox row makes a sound; the summary does not alert on its own.
            .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
            .setAutoCancel(true)
            // If the launcher fires the summary instead of expanding it, at least it opens the latest vox.
            .setContentIntent(pendingIntent)
            .build()

        try {
            manager.notify(payload.stableId, builder.build())
            manager.notify(payload.summaryId, summary)
        } catch (_: SecurityException) {
            // Permission revoked between the check and the notification.
        }
    }

    /** Removes the rows of a vox the user already opened in the app, as any messaging app does. */
    fun cancelForVox(context: Context, voxId: String) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        val shown = manager.activeNotifications.map { sbn ->
            ShownNotification(
                id = sbn.id,
                group = sbn.notification.group,
                isSummary = sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0,
                voxId = sbn.notification.extras.getString(EXTRA_VOX_ID),
            )
        }
        VoxNotificationCleanup.idsToCancel(shown, voxId).forEach(manager::cancel)
    }

    /** Comments already counted in the vox row; 0 if the user dismissed it. */
    private fun activeCount(context: Context, id: Int): Int {
        val active = context.getSystemService(NotificationManager::class.java)
            ?.activeNotifications
            ?.firstOrNull { it.id == id }
            ?: return 0
        return active.notification.extras.getInt(EXTRA_COUNT, 1)
    }

    private const val EXTRA_COUNT = "pro.voxer.app.push.COUNT"
    private const val EXTRA_VOX_ID = "pro.voxer.app.push.VOX_ID"
}
