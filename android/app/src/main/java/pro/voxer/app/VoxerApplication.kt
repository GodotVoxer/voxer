package pro.voxer.app

import android.app.Application
import pro.voxer.app.push.NotificationChannels

class VoxerApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        NotificationChannels.ensure(this)
    }
}
