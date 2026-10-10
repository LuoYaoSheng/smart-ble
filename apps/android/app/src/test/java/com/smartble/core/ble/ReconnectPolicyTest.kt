package com.smartble.core.ble

import org.junit.Assert.assertEquals
import org.junit.Test

class ReconnectPolicyTest {
    @Test fun backoffMatchesTheSharedProductContract() {
        assertEquals(listOf(1000L, 3000L, 5000L), (1..3).map(::reconnectDelayMillis))
    }
    @Test(expected = IllegalArgumentException::class) fun fourthAttemptIsNotAllowed() {
        reconnectDelayMillis(4)
    }
}
