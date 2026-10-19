package com.smartble.core.ble

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GattAcknowledgementTest {
    @Test fun immediateCallbackIsNotLost() = runBlocking {
        val events = MutableSharedFlow<Boolean>(extraBufferCapacity = 1)
        assertTrue(awaitGattAcknowledgement(events, 1000) { events.tryEmit(true); true })
    }
    @Test fun callbackFailureIsNotAcceptedAsSuccess() = runBlocking {
        val events = MutableSharedFlow<Boolean>(extraBufferCapacity = 1)
        assertFalse(awaitGattAcknowledgement(events, 1000) { events.tryEmit(false); true })
    }
    @Test fun rejectedSubmissionDoesNotWaitForAnAcknowledgement() = runBlocking {
        assertFalse(awaitGattAcknowledgement(MutableSharedFlow(), 1000) { false })
    }
    @Test fun missingCallbackTimesOutInsteadOfClaimingSuccess() = runBlocking {
        assertFalse(awaitGattAcknowledgement(MutableSharedFlow(), 10) { true })
    }
}
