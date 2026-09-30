package pro.voxer.app.web

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test

class VoxerJsBridgeTest {

    @Test
    fun `appInfo tells the page the package and the push transport`() {
        val info = JSONObject(VoxerJsBridge.appInfoJson("1.1.0", 11, 35, "pro.voxer.app", "unifiedpush", false))
        assertEquals("android", info.getString("platform"))
        assertEquals("1.1.0", info.getString("versionName"))
        assertEquals(11, info.getInt("versionCode"))
        assertEquals(35, info.getInt("sdkInt"))
        assertEquals("pro.voxer.app", info.getString("packageName"))
        assertEquals("unifiedpush", info.getString("pushProvider"))
        assertEquals(false, info.getBoolean("pushAvailable"))
    }
}
