package pro.voxer.app.web

object PullToRefreshGate {
    fun canStart(
        canScrollUp: Boolean,
        gestureLocked: Boolean,
        fullscreenActive: Boolean,
        connectionErrorVisible: Boolean,
        siteLoaded: Boolean,
    ): Boolean =
        siteLoaded &&
            !canScrollUp &&
            !gestureLocked &&
            !fullscreenActive &&
            !connectionErrorVisible
}
