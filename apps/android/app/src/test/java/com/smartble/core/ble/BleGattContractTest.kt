package com.smartble.core.ble

import com.smartble.core.model.BleCharacteristic
import com.smartble.core.model.BleService
import com.smartble.core.model.Property
import com.smartble.ui.viewmodel.shouldAnnounceServices
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * W2 K-AND GATT 契约锁：
 * - WIN-AAND-004：读值进可观察流（CharacteristicChangeEvent 带 kind）
 * - WIN-AAND-006：常规连接统一协商 MTU 247
 * - WIN-AAND-007：服务播报只在 UUID 集合变化时发生
 */
class BleGattContractTest {

    private fun service(uuid: String): BleService = BleService(
        uuid = uuid,
        characteristics = listOf(
            BleCharacteristic(
                serviceUuid = uuid,
                uuid = "$uuid-char",
                properties = setOf(Property.Read, Property.Notify)
            )
        )
    )

    @Test
    fun `WIN-AAND-006 常规连接请求 MTU 247`() {
        assertEquals(247, BleManager.REQUESTED_MTU)
    }

    @Test
    fun `WIN-AAND-004 事件默认为通知，读取事件带 kind 并参与等值`() {
        val notify = CharacteristicChangeEvent(
            deviceId = "AA", serviceUuid = "S", characteristicUuid = "C",
            value = byteArrayOf(0x01)
        )
        assertEquals(CharacteristicChangeKind.Notify, notify.kind)

        val read = notify.copy(kind = CharacteristicChangeKind.Read)
        assertEquals(CharacteristicChangeKind.Read, read.kind)
        assertNotEquals(notify, read)
        assertEquals(notify, notify.copy())
    }

    @Test
    fun `WIN-AAND-007 特征值更新不重播服务发现`() {
        val services = listOf(service("00001800-0000-1000-8000-00805F9B34FB"))
        val uuids = services.map { it.uuid }.toSet()

        // 首次发现 → 播报
        assertTrue(shouldAnnounceServices(emptySet(), services))
        // 同集合重放（读/写/notify 触发的特征值更新）→ 不播报
        assertFalse(shouldAnnounceServices(uuids, services))
        // 空列表（断开清理）→ 不播报
        assertFalse(shouldAnnounceServices(uuids, emptyList()))
        // 重连后 UUID 集合变化 → 重新播报
        val changed = services + service("0000180F-0000-1000-8000-00805F9B34FB")
        assertTrue(shouldAnnounceServices(uuids, changed))
        // 构造序防御：lastUuids=null（属性未初始化/无历史）→ 非空集合即播报，
        // 空列表仍不播报（4c9d31a 连接即崩回归锁：null 不得抛 NPE）
        assertTrue(shouldAnnounceServices(null, services))
        assertFalse(shouldAnnounceServices(null, emptyList()))
    }
}
