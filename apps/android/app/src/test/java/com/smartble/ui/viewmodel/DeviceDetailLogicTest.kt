package com.smartble.ui.viewmodel

import com.smartble.core.model.BleCharacteristic
import com.smartble.core.model.BleService
import com.smartble.core.model.ConnectionState
import com.smartble.core.model.LogEntry
import com.smartble.core.model.LogType
import com.smartble.core.model.Property
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DeviceDetailLogicTest {

    @Test
    fun `buildDeviceExportText includes device summary services and logs`() {
        val services = listOf(
            BleService(
                uuid = "0000180F-0000-1000-8000-00805F9B34FB",
                characteristics = listOf(
                    BleCharacteristic(
                        serviceUuid = "0000180F-0000-1000-8000-00805F9B34FB",
                        uuid = "00002A19-0000-1000-8000-00805F9B34FB",
                        properties = setOf(Property.Read)
                    )
                )
            )
        )
        val logs = listOf(
            LogEntry(
                message = "发现 1 个服务",
                type = LogType.Info,
                timestamp = "10:00:00"
            )
        )

        val exported = buildDeviceExportText(
            deviceId = "AA:BB:CC:DD:EE:FF",
            deviceName = "Demo Device",
            connectionState = ConnectionState.Connected,
            services = services,
            logs = logs,
            exportTime = "2026-03-29 10:00:00"
        )

        assertTrue(exported.contains("名称: Demo Device"))
        assertTrue(exported.contains("ID: AA:BB:CC:DD:EE:FF"))
        assertTrue(exported.contains("连接状态: 已连接"))
        assertTrue(exported.contains("Battery Service"))
        assertTrue(exported.contains("[10:00:00] Info: 发现 1 个服务"))
    }

    @Test
    fun `applyOtaStatusPayload updates progress state`() {
        val current = OtaUiState(
            isInProgress = true,
            totalBytes = 1000,
            sentBytes = 100,
            progressPercent = 10
        )

        val transition = applyOtaStatusPayload(
            current,
            """{"type":"ota","status":"progress","received":500,"total":1000,"percent":50}"""
        )

        assertNotNull(transition)
        assertEquals(500L, transition!!.state.sentBytes)
        assertEquals(1000L, transition.state.totalBytes)
        assertEquals(50, transition.state.progressPercent)
        assertEquals("设备正在写入固件...", transition.state.statusMessage)
    }

    @Test
    fun `applyOtaStatusPayload marks success and emits success log`() {
        val current = OtaUiState(
            isInProgress = true,
            totalBytes = 1024,
            sentBytes = 1024,
            progressPercent = 99
        )

        val transition = applyOtaStatusPayload(
            current,
            """{"type":"ota","status":"success","received":1024,"total":1024,"percent":100,"rebooting":true}"""
        )

        assertNotNull(transition)
        assertTrue(transition!!.state.isCompleted)
        assertEquals(false, transition.state.isInProgress)
        assertEquals(100, transition.state.progressPercent)
        assertEquals("OTA 成功，设备即将重启", transition.state.statusMessage)
        assertEquals("OTA 成功，设备即将重启", transition.logMessage)
        assertEquals(LogType.Success, transition.logType)
    }

    @Test
    fun `applyOtaStatusPayload maps error message`() {
        val transition = applyOtaStatusPayload(
            OtaUiState(isInProgress = true),
            """{"type":"ota","status":"error","message":"size_mismatch"}"""
        )

        assertNotNull(transition)
        assertEquals("OTA 失败", transition!!.state.statusMessage)
        assertEquals("size_mismatch", transition.state.errorMessage)
        assertEquals(LogType.Error, transition.logType)
    }
}
