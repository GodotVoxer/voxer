package pro.voxer.app.push

import android.content.Context
import androidx.activity.ComponentActivity
import com.google.firebase.messaging.FirebaseMessaging

object FcmPushProvider : PushProvider {
    override val id = "fcm"

    override fun isAvailable(context: Context) = true

    // `getToken()` is deprecated in firebase-messaging 25.x with no public replacement: it is still
    // the only way to get the registration token.
    @Suppress("DEPRECATION")
    override fun register(activity: ComponentActivity, onResult: (String?) -> Unit) {
        // Throws when the build has no Firebase configuration: no push rather than a crash.
        val messaging = runCatching { FirebaseMessaging.getInstance() }.getOrNull()
            ?: return onResult(null)
        messaging.token
            .addOnSuccessListener { token ->
                PushTokenStore(activity).token = token
                onResult(token)
            }
            .addOnFailureListener { onResult(null) }
    }
}
