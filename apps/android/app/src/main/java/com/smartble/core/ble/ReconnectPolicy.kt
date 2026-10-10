package com.smartble.core.ble

internal fun reconnectDelayMillis(attempt: Int): Long {
    require(attempt in 1..3) { "Reconnect attempt must be 1..3" }
    return longArrayOf(1000L, 3000L, 5000L)[attempt - 1]
}
