package pro.voxer.app.web

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PullToRefreshGateTest {

    @Test
    fun `allows refreshing when the site loaded and is at the top`() {
        assertTrue(
            PullToRefreshGate.canStart(
                canScrollUp = false,
                gestureLocked = false,
                fullscreenActive = false,
                connectionErrorVisible = false,
                siteLoaded = true,
            ),
        )
    }

    @Test
    fun `blocks the gesture outside the safe state`() {
        val unsafeStates = listOf(
            PullToRefreshGate.canStart(true, false, false, false, true),
            PullToRefreshGate.canStart(false, true, false, false, true),
            PullToRefreshGate.canStart(false, false, true, false, true),
            PullToRefreshGate.canStart(false, false, false, true, true),
            PullToRefreshGate.canStart(false, false, false, false, false),
        )

        unsafeStates.forEach { assertFalse(it) }
    }
}
