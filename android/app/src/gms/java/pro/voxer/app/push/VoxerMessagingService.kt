package pro.voxer.app.push

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class VoxerMessagingService : FirebaseMessagingService() {

    // Deprecated in firebase-messaging 25.x with no public replacement; it is the documented callback
    // for token rotation.
    @Suppress("OVERRIDE_DEPRECATION")
    override fun onNewToken(token: String) {
        // Only cached: the page, which holds the session, POSTs it to the backend.
        PushTokenStore(this).token = token
    }

    override fun onMessageReceived(message: RemoteMessage) = PushNotifier.show(this, message.data)
}
