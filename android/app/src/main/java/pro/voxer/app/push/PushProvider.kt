package pro.voxer.app.push

import android.content.Context
import androidx.activity.ComponentActivity

/** The push transport of this build flavor: FCM in `gms`, UnifiedPush in `fdroid` (see `FlavorPush`). */
interface PushProvider {
    /** Reported to the page in `appInfo`, so it knows what `getPushToken()` returns. */
    val id: String

    /** False when push cannot work on this device, e.g. no UnifiedPush distributor installed. */
    fun isAvailable(context: Context): Boolean

    /**
     * Obtains a registration and stores it in [PushTokenStore]. [onResult] gets it when it is ready
     * right away, or null; a UnifiedPush endpoint may arrive later, through the store.
     */
    fun register(activity: ComponentActivity, onResult: (String?) -> Unit)
}
