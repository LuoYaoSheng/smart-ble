package com.smartble.core.model

/**
 * BLE 服务
 */
data class BleService(
    val uuid: String,
    val characteristics: List<BleCharacteristic> = emptyList(),
) {
    val shortUuid: String
        get() = uuid.shortUuid()

    val displayName: String
        get() = BleUuids.getServiceName(uuid)
}

/**
 * BLE 特征值
 */
data class BleCharacteristic(
    val serviceUuid: String,
    val uuid: String,
    val properties: Set<Property>,
    val value: ByteArray? = null,
    val isNotifying: Boolean = false,
) {
    val shortUuid: String
        get() = uuid.shortUuid()

    val displayName: String
        get() = BleUuids.getCharacteristicName(uuid)

    val canRead: Boolean
        get() = properties.contains(Property.Read)

    val canWrite: Boolean
        get() = properties.contains(Property.Write) ||
                 properties.contains(Property.WriteNoResponse)

    val canNotify: Boolean
        get() = properties.contains(Property.Notify) ||
                 properties.contains(Property.Indicate)

    fun copyWithValue(value: ByteArray?): BleCharacteristic {
        return copy(value = value)
    }

    fun copyWithNotifying(notifying: Boolean): BleCharacteristic {
        return copy(isNotifying = notifying)
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as BleCharacteristic

        if (serviceUuid != other.serviceUuid) return false
        if (uuid != other.uuid) return false
        if (properties != other.properties) return false
        if (value != null) {
            if (other.value == null) return false
            if (!value.contentEquals(other.value)) return false
        } else if (other.value != null) return false
        if (isNotifying != other.isNotifying) return false

        return true
    }

    override fun hashCode(): Int {
        var result = serviceUuid.hashCode()
        result = 31 * result + uuid.hashCode()
        result = 31 * result + properties.hashCode()
        result = 31 * result + (value?.contentHashCode() ?: 0)
        result = 31 * result + isNotifying.hashCode()
        return result
    }
}

/**
 * 特征值属性
 */
enum class Property {
    Read,
    Write,
    WriteNoResponse,
    Notify,
    Indicate,
    AuthenticatedSignedWrites,
    ExtendedProperties,
}

/**
 * BLE UUID 常量和工具
 */
object BleUuids {
    // 通用服务 UUID
    const val SERVICE_GENERIC_ACCESS = "00001800-0000-1000-8000-00805F9B34FB"
    const val SERVICE_GENERIC_ATTRIBUTE = "00001801-0000-1000-8000-00805F9B34FB"
    const val SERVICE_DEVICE_INFORMATION = "0000180A-0000-1000-8000-00805F9B34FB"
    const val SERVICE_BATTERY = "0000180F-0000-1000-8000-00805F9B34FB"
    const val SERVICE_HUMAN_INTERFACE_DEVICE = "00001812-0000-1000-8000-00805F9B34FB"
    const val SERVICE_OTA = "4fafc201-1fb5-459e-8fcc-c5c9c331914d"

    // 通用特征值 UUID
    const val CHARACTERISTIC_DEVICE_NAME = "00002A00-0000-1000-8000-00805F9B34FB"
    const val CHARACTERISTIC_APPEARANCE = "00002A01-0000-1000-8000-00805F9B34FB"
    const val CHARACTERISTIC_PERIPHERAL_PRIVACY_FLAG = "00002A02-0000-1000-8000-00805F9B34FB"
    const val CHARACTERISTIC_RECONNECTION_ADDRESS = "00002A03-0000-1000-8000-00805F9B34FB"
    const val CHARACTERISTIC_PERIPHERAL_PREFERRED_CONNECTION_PARAMETERS = "00002A04-0000-1000-8000-00805F9B34FB"
    const val CHARACTERISTIC_SERVICE_CHANGED = "00002A05-0000-1000-8000-00805F9B34FB"

    // 设备信息服务特征值
    const val CHARACTERISTIC_MANUFACTURER_NAME = "00002A29-0000-1000-8000-00805F9B34FB"
    const val CHARACTERISTIC_MODEL_NUMBER = "00002A24-0000-1000-8000-00805F9B34FB"
    const val CHARACTERISTIC_SERIAL_NUMBER = "00002A25-0000-1000-8000-00805F9B34FB"
    const val CHARACTERISTIC_HARDWARE_REVISION = "00002A27-0000-1000-8000-00805F9B34FB"
    const val CHARACTERISTIC_FIRMWARE_REVISION = "00002A26-0000-1000-8000-00805F9B34FB"
    const val CHARACTERISTIC_SOFTWARE_REVISION = "00002A28-0000-1000-8000-00805F9B34FB"
    const val CHARACTERISTIC_SYSTEM_ID = "00002A23-0000-1000-8000-00805F9B34FB"

    // 电池服务特征值
    const val CHARACTERISTIC_BATTERY_LEVEL = "00002A19-0000-1000-8000-00805F9B34FB"

    // OTA 特征值
    const val CHARACTERISTIC_OTA_CONTROL = "beb5483e-36e1-4688-b7f5-ea07361b26c0"
    const val CHARACTERISTIC_OTA_DATA = "beb5483e-36e1-4688-b7f5-ea07361b26c1"
    const val CHARACTERISTIC_OTA_STATUS = "beb5483e-36e1-4688-b7f5-ea07361b26c2"

    private val serviceNames = mapOf(
        SERVICE_GENERIC_ACCESS to "Generic Access",
        SERVICE_GENERIC_ATTRIBUTE to "Generic Attribute",
        SERVICE_DEVICE_INFORMATION to "Device Information",
        SERVICE_BATTERY to "Battery Service",
        SERVICE_HUMAN_INTERFACE_DEVICE to "HID",
        SERVICE_OTA to "OTA Service",
    )

    private val characteristicNames = mapOf(
        CHARACTERISTIC_DEVICE_NAME to "Device Name",
        CHARACTERISTIC_APPEARANCE to "Appearance",
        CHARACTERISTIC_PERIPHERAL_PRIVACY_FLAG to "Privacy Flag",
        CHARACTERISTIC_RECONNECTION_ADDRESS to "Reconnection Address",
        CHARACTERISTIC_PERIPHERAL_PREFERRED_CONNECTION_PARAMETERS to "Connection Parameters",
        CHARACTERISTIC_SERVICE_CHANGED to "Service Changed",
        CHARACTERISTIC_MANUFACTURER_NAME to "Manufacturer Name",
        CHARACTERISTIC_MODEL_NUMBER to "Model Number",
        CHARACTERISTIC_SERIAL_NUMBER to "Serial Number",
        CHARACTERISTIC_HARDWARE_REVISION to "Hardware Revision",
        CHARACTERISTIC_FIRMWARE_REVISION to "Firmware Revision",
        CHARACTERISTIC_SOFTWARE_REVISION to "Software Revision",
        CHARACTERISTIC_SYSTEM_ID to "System ID",
        CHARACTERISTIC_BATTERY_LEVEL to "Battery Level",
        CHARACTERISTIC_OTA_CONTROL to "OTA Control",
        CHARACTERISTIC_OTA_DATA to "OTA Data",
        CHARACTERISTIC_OTA_STATUS to "OTA Status",
    )

    fun getServiceName(uuid: String): String {
        return serviceNames[uuid] ?: "Unknown Service"
    }

    fun getCharacteristicName(uuid: String): String {
        return characteristicNames[uuid] ?: "Unknown Characteristic"
    }
}

/**
 * UUID 扩展函数
 */
fun String.shortUuid(): String {
    return if (length == 36) {
        substring(4, 8)
    } else {
        this
    }
}


