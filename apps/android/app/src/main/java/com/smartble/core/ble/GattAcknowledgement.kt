package com.smartble.core.ble

import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull

/** Register before submission: Android callbacks may complete synchronously. */
internal suspend fun awaitGattAcknowledgement(
    completions: Flow<Boolean>,
    timeoutMs: Long,
    submit: () -> Boolean,
): Boolean = coroutineScope {
    val acknowledgement = async(start = CoroutineStart.UNDISPATCHED) {
        withTimeoutOrNull(timeoutMs) { completions.first() } == true
    }
    try {
        if (!submit()) false else acknowledgement.await()
    } finally {
        acknowledgement.cancel()
    }
}
