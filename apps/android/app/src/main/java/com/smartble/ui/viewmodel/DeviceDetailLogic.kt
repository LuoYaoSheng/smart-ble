package com.smartble.ui.viewmodel

import com.smartble.core.model.BleService
import com.smartble.core.model.ConnectionState
import com.smartble.core.model.LogEntry
import org.json.JSONObject

data class OtaStatusTransition(
    val state: OtaUiState,
    val logMessage: String? = null,
    val logType: LogType? = null,
)

fun buildDeviceExportText(
    deviceId: String,
    deviceName: String,
    connectionState: ConnectionState,
    services: List<BleService>,
    logs: List<LogEntry>,
    exportTime: String,
): String {
    val servicesSummary = if (services.isEmpty()) {
        "无"
    } else {
        services.joinToString(separator = "\n") { service ->
            "- ${service.displayName} (${service.shortUuid}) / ${service.characteristics.size} 个特征值"
        }
    }

    val logsSummary = if (logs.isEmpty()) {
        "无"
    } else {
        logs.joinToString(separator = "\n") { log ->
            "[${log.timestamp}] ${log.type.name}: ${log.message}"
        }
    }

    return buildString {
        appendLine("BLE Toolkit+ 数据导出")
        appendLine("导出时间: $exportTime")
        appendLine()
        appendLine("设备信息")
        appendLine("名称: $deviceName")
        appendLine("ID: $deviceId")
        appendLine("连接状态: ${connectionState.toDisplayText()}")
        appendLine()
        appendLine("服务摘要")
        appendLine(servicesSummary)
        appendLine()
        appendLine("操作日志")
        appendLine(logsSummary)
    }.trim()
}

fun applyOtaStatusPayload(current: OtaUiState, rawPayload: String): OtaStatusTransition? {
    val json = runCatching { JSONObject(rawPayload) }.getOrNull() ?: return null
    if (json.optString("type") != "ota") return null

    val status = json.optString("status")
    val message = json.optString("message")
    val received = json.optLong("received", current.sentBytes)
    val total = json.optLong("total", current.totalBytes)
    val percent = json.optInt(
        "percent",
        if (total > 0) ((received * 100) / total).toInt() else current.progressPercent
    )

    return when (status) {
        "ready" -> OtaStatusTransition(
            state = current.copy(
                statusMessage = "设备已进入 OTA 模式",
                errorMessage = null
            ),
            logMessage = "OTA 设备已就绪",
            logType = LogType.Success
        )

        "progress" -> OtaStatusTransition(
            state = current.copy(
                sentBytes = received,
                totalBytes = total,
                progressPercent = percent,
                statusMessage = "设备正在写入固件..."
            )
        )

        "success" -> OtaStatusTransition(
            state = current.copy(
                isInProgress = false,
                isCompleted = true,
                sentBytes = total.coerceAtLeast(current.sentBytes),
                totalBytes = total.coerceAtLeast(current.totalBytes),
                progressPercent = 100,
                statusMessage = "OTA 成功，设备即将重启",
                errorMessage = null
            ),
            logMessage = "OTA 成功，设备即将重启",
            logType = LogType.Success
        )

        "aborted" -> OtaStatusTransition(
            state = current.copy(
                isInProgress = false,
                isCompleted = false,
                statusMessage = "OTA 已中止",
                errorMessage = null
            ),
            logMessage = "OTA 已中止",
            logType = LogType.Info
        )

        "error" -> {
            val errorText = if (message.isBlank()) "设备返回 OTA 错误" else message
            OtaStatusTransition(
                state = current.copy(
                    isInProgress = false,
                    isCompleted = false,
                    statusMessage = "OTA 失败",
                    errorMessage = errorText
                ),
                logMessage = "OTA 错误: $errorText",
                logType = LogType.Error
            )
        }

        else -> null
    }
}

fun ConnectionState.toDisplayText(): String = when (this) {
    ConnectionState.Connected -> "已连接"
    ConnectionState.Connecting -> "连接中"
    ConnectionState.Disconnected -> "未连接"
    ConnectionState.Disconnecting -> "断开中"
}
