package pro.voxer.app.web

import android.content.pm.ActivityInfo
import org.junit.Assert.assertEquals
import org.junit.Test

class FullscreenVideoOrientationTest {

    @Test
    fun `keeps vertical videos in portrait`() {
        assertEquals(
            ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT,
            fullscreenVideoOrientation("\"1080:1920\""),
        )
    }

    @Test
    fun `rotates horizontal videos to landscape`() {
        assertEquals(
            ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE,
            fullscreenVideoOrientation("\"1920:1080\""),
        )
    }

    @Test
    fun `allows both orientations for square videos`() {
        assertEquals(
            ActivityInfo.SCREEN_ORIENTATION_SENSOR,
            fullscreenVideoOrientation("\"1080:1080\""),
        )
    }

    @Test
    fun `keeps landscape when the WebView reports no dimensions`() {
        assertEquals(
            ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE,
            fullscreenVideoOrientation("\"\""),
        )
        assertEquals(
            ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE,
            fullscreenVideoOrientation(null),
        )
    }

    @Test
    fun `ignores invalid dimensions`() {
        assertEquals(
            ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE,
            fullscreenVideoOrientation("\"0:1920\""),
        )
        assertEquals(
            ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE,
            fullscreenVideoOrientation("valor inesperado"),
        )
    }
}
