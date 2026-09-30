package pro.voxer.app.push

import android.content.Context
import androidx.activity.ComponentActivity
import org.unifiedpush.android.connector.UnifiedPush

/**
 * Push through the user's UnifiedPush distributor (ntfy, NextPush…), with Web Push encryption and
 * the server's VAPID key. Without a distributor installed there is no push, and [register] reports null.
 */
object UnifiedPushProvider : PushProvider {
    override val id = "unifiedpush"

    override fun isAvailable(context: Context) = UnifiedPush.getDistributors(context).isNotEmpty()

    override fun register(activity: ComponentActivity, onResult: (String?) -> Unit) {
        UnifiedPush.tryUseCurrentOrDefaultDistributor(activity) { ready ->
            if (!ready) {
                onResult(null)
                return@tryUseCurrentOrDefaultDistributor
            }
            val store = PushTokenStore(activity)
            val vapid = store.vapidPublicKey?.takeIf { UnifiedPushData.isVapidPublicKey(it) }
            UnifiedPush.register(activity, vapid = vapid)
            // The endpoint arrives in `VoxerPushService` and reaches the page through the store.
            onResult(store.token)
        }
    }
}
