package pro.voxer.app.web

import android.content.pm.ActivityInfo

internal const val FULLSCREEN_VIDEO_DIMENSIONS_SCRIPT =
    "(function(){" +
        "var e=document.fullscreenElement||document.webkitFullscreenElement;" +
        "var v=e&&(e.tagName==='VIDEO'?e:(e.querySelector&&e.querySelector('video')));" +
        "if(!v){var a=document.querySelectorAll('video');" +
        "for(var i=0;i<a.length;i++){if(!a[i].paused&&!a[i].ended){v=a[i];break;}}}" +
        "return v&&v.videoWidth>0&&v.videoHeight>0?v.videoWidth+':'+v.videoHeight:'';" +
        "})()"

internal fun fullscreenVideoOrientation(rawDimensions: String?): Int {
    val dimensions = rawDimensions
        ?.removeSurrounding("\"")
        ?.split(':')
        ?.takeIf { it.size == 2 }
        ?.mapNotNull(String::toIntOrNull)
        ?.takeIf { it.size == 2 && it.all { dimension -> dimension > 0 } }
        ?: return ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE

    val (width, height) = dimensions
    return when {
        height > width -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT
        width > height -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        else -> ActivityInfo.SCREEN_ORIENTATION_SENSOR
    }
}
