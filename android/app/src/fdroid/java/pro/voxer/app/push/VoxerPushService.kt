package pro.voxer.app.push

import org.unifiedpush.android.connector.FailedReason
import org.unifiedpush.android.connector.PushService
import org.unifiedpush.android.connector.data.PushEndpoint
import org.unifiedpush.android.connector.data.PushMessage

class VoxerPushService : PushService() {

    override fun onNewEndpoint(endpoint: PushEndpoint, instance: String) {
        // Without keys the server could not encrypt, and the distributor would see the content.
        val keys = endpoint.pubKeySet ?: return
        PushTokenStore(this).token = UnifiedPushData.registrationJson(endpoint.url, keys.pubKey, keys.auth)
    }

    override fun onMessage(message: PushMessage, instance: String) {
        if (!message.decrypted) return
        val data = UnifiedPushData.parseMessage(message.content.decodeToString()) ?: return
        PushNotifier.show(this, data)
    }

    override fun onRegistrationFailed(reason: FailedReason, instance: String) {
        PushTokenStore(this).token = null
    }

    override fun onUnregistered(instance: String) {
        PushTokenStore(this).token = null
    }
}
