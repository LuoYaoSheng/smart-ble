package com.smartble.ui.design

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

/**
 * 正典描边图标（prototype v1-new index.html `#i-*` · 22 视口 · round cap/join）。
 * 路径与原型逐字一致（Compose addPathNodes 要求弧线参数空格分隔）；
 * 图标色以 tint 覆盖，选中/未选中由调用方着色。
 */
private data class DsPath(val d: String, val filled: Boolean = false, val strokeW: Float = 1.8f)

private fun dsIcon(name: String, paths: List<DsPath>): ImageVector =
    ImageVector.Builder(
        name = name,
        defaultWidth = 22.dp,
        defaultHeight = 22.dp,
        viewportWidth = 22f,
        viewportHeight = 22f,
    ).apply {
        for (p in paths) {
            if (p.filled) {
                addPath(addPathNodes(p.d), fill = SolidColor(Color.Black), stroke = null)
            } else {
                addPath(
                    addPathNodes(p.d),
                    fill = SolidColor(Color.Transparent),
                    stroke = SolidColor(Color.Black),
                    strokeLineWidth = p.strokeW,
                    strokeLineCap = StrokeCap.Round,
                    strokeLineJoin = StrokeJoin.Round,
                )
            }
        }
    }.build()

object DsIcons {
    /** #i-scan：放大镜 + 十字（TabBar 扫描 / 开始扫描按钮） */
    val Scan: ImageVector by lazy {
        dsIcon(
            "scan",
            listOf(
                DsPath("M4 11 a7 7 0 0 1 14 0 a7 7 0 0 1 -14 0"),
                DsPath("M16.5 16.5 L21 21"),
                DsPath("M11 8 v6"),
                DsPath("M8 11 h6"),
            ),
        )
    }

    /** #i-link：链环（TabBar 已连接 / P007 空态） */
    val Link: ImageVector by lazy {
        dsIcon(
            "link",
            listOf(
                DsPath("M10 13 a5 5 0 0 0 7.54 0.54 l3 -3 a5 5 0 0 0 -7.07 -7.07 l-1.72 1.71"),
                DsPath("M14 11 a5 5 0 0 0 -7.54 -0.54 l-3 3 a5 5 0 0 0 7.07 7.07 l1.72 -1.71"),
            ),
        )
    }

    /** #i-cast：广播波（TabBar 广播 / 开始广播按钮） */
    val Cast: ImageVector by lazy {
        dsIcon(
            "cast",
            listOf(
                DsPath("M10.4 12 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0", filled = true),
                DsPath("M8.2 15.8 a5.4 5.4 0 0 1 0 -7.6"),
                DsPath("M15.8 8.2 a5.4 5.4 0 0 1 0 7.6"),
                DsPath("M5.3 18.7 a9.5 9.5 0 0 1 0 -13.4"),
                DsPath("M18.7 5.3 a9.5 9.5 0 0 1 0 13.4"),
            ),
        )
    }

    /** #i-info：信息圆（TabBar 关于 / P009 组标题） */
    val Info: ImageVector by lazy {
        dsIcon(
            "info",
            listOf(
                DsPath("M3 12 a9 9 0 0 1 18 0 a9 9 0 0 1 -18 0"),
                DsPath("M12 11 v5"),
                DsPath("M11.4 8 a0.6 0.6 0 1 0 1.2 0 a0.6 0.6 0 1 0 -1.2 0", filled = true),
            ),
        )
    }

    /** #i-chip：芯片（P001/P006 组标题 / 服务图标） */
    val Chip: ImageVector by lazy {
        dsIcon(
            "chip",
            listOf(
                DsPath("M8.5 6 h7 a2.5 2.5 0 0 1 2.5 2.5 v7 a2.5 2.5 0 0 1 -2.5 2.5 h-7 a2.5 2.5 0 0 1 -2.5 -2.5 v-7 a2.5 2.5 0 0 1 2.5 -2.5 z"),
                DsPath("M11 10 h2 a1 1 0 0 1 1 1 v2 a1 1 0 0 1 -1 1 h-2 a1 1 0 0 1 -1 -1 v-2 a1 1 0 0 1 1 -1 z"),
                DsPath("M9 2.5 V6 M15 2.5 V6 M9 18 V21.5 M15 18 V21.5 M2.5 9 H6 M2.5 15 H6 M18 9 H21.5 M18 15 H21.5"),
            ),
        )
    }

    /** #i-stop：停止方框（停止扫描 / 停止广播） */
    val Stop: ImageVector by lazy {
        dsIcon("stop", listOf(DsPath("M8 6 h8 a2 2 0 0 1 2 2 v8 a2 2 0 0 1 -2 2 h-8 a2 2 0 0 1 -2 -2 v-8 a2 2 0 0 1 2 -2 z")))
    }

    /** #i-bt：蓝牙形（P009 应用图标） */
    val Bt: ImageVector by lazy {
        dsIcon("bt", listOf(DsPath("M7 7 L17 17 L12 21 V3 L17 7 L7 17")))
    }

    /** #i-check：对勾（已连接角标 / 完成态） */
    val Check: ImageVector by lazy {
        dsIcon("check", listOf(DsPath("M5 12.5 L9.5 17 L19 7", strokeW = 2.2f)))
    }

    /** #i-x：叉（断开 / 失败态） */
    val X: ImageVector by lazy {
        dsIcon("x", listOf(DsPath("M6 6 L18 18", strokeW = 2f), DsPath("M18 6 L6 18", strokeW = 2f)))
    }

    /** #i-warn：警示三角（警告 note / err-line / 限制条目） */
    val Warn: ImageVector by lazy {
        dsIcon(
            "warn",
            listOf(
                DsPath("M12 3.5 L2.5 19.5 h19 z"),
                DsPath("M12 10 v4"),
                DsPath("M11.4 16.8 a0.6 0.6 0 1 0 1.2 0 a0.6 0.6 0 1 0 -1.2 0", filled = true),
            ),
        )
    }

    /** #i-copy：复制（导出日志 / 复制版本信息） */
    val Copy: ImageVector by lazy {
        dsIcon(
            "copy",
            listOf(
                DsPath("M11.5 9 h7 a2.5 2.5 0 0 1 2.5 2.5 v7 a2.5 2.5 0 0 1 -2.5 2.5 h-7 a2.5 2.5 0 0 1 -2.5 -2.5 v-7 a2.5 2.5 0 0 1 2.5 -2.5 z"),
                DsPath("M5 15 H4.5 A1.5 1.5 0 0 1 3 13.5 v-9 A1.5 1.5 0 0 1 4.5 3 h9 A1.5 1.5 0 0 1 15 4.5 V5"),
            ),
        )
    }

    /** #i-refresh：重试 / 检查支持 */
    val Refresh: ImageVector by lazy {
        dsIcon(
            "refresh",
            listOf(
                DsPath("M21 12 a9 9 0 1 1 -2.64 -6.36"),
                DsPath("M21 3 v6 h-6"),
            ),
        )
    }

    /** #i-send：纸飞机（P009 问题反馈） */
    val Send: ImageVector by lazy {
        dsIcon(
            "send",
            listOf(
                DsPath("M21.5 2.5 L11 13"),
                DsPath("M21.5 2.5 L14.5 21.5 L11 13 L2.5 9.5 z"),
            ),
        )
    }

    /** #i-doc：文档（P009 版本记录 / P010） */
    val Doc: ImageVector by lazy {
        dsIcon(
            "doc",
            listOf(
                DsPath("M14 2.5 H6.5 A1.5 1.5 0 0 0 5 4 v16 a1.5 1.5 0 0 0 1.5 1.5 h11 A1.5 1.5 0 0 0 19 20 V7.5 z"),
                DsPath("M14 2.5 v5 h5"),
            ),
        )
    }

    /** #i-ext：外链（P009 官方网站） */
    val Ext: ImageVector by lazy {
        dsIcon(
            "ext",
            listOf(
                DsPath("M13.5 4.5 H19.5 V10.5"),
                DsPath("M19.5 4.5 L11 13"),
                DsPath("M19.5 13.5 V19 a1.5 1.5 0 0 1 -1.5 1.5 H5 A1.5 1.5 0 0 1 3.5 19 V6 A1.5 1.5 0 0 1 5 4.5 h5.5"),
            ),
        )
    }

    /** #i-share：分享节点（P009 更多小程序 / 分享应用） */
    val Share: ImageVector by lazy {
        dsIcon(
            "share",
            listOf(
                DsPath("M15.4 5 a2.6 2.6 0 0 1 5.2 0 a2.6 2.6 0 0 1 -5.2 0"),
                DsPath("M3.4 12 a2.6 2.6 0 0 1 5.2 0 a2.6 2.6 0 0 1 -5.2 0"),
                DsPath("M15.4 19 a2.6 2.6 0 0 1 5.2 0 a2.6 2.6 0 0 1 -5.2 0"),
                DsPath("M8.3 10.8 L15.7 6.5"),
                DsPath("M8.3 13.2 L15.7 17.5"),
            ),
        )
    }

    /** #i-chev-r：右尖角（返回键 rotate180 / 列表箭头 / 折叠 chev） */
    val ChevR: ImageVector by lazy {
        dsIcon("chev-r", listOf(DsPath("M9 6 L15 12 L9 18", strokeW = 2f)))
    }

    /** #i-chev-d：下尖角（P008 picker） */
    val ChevD: ImageVector by lazy {
        dsIcon("chev-d", listOf(DsPath("M6 9 L12 15 L18 9", strokeW = 2f)))
    }

    /** #i-log：日志文档（通信日志标题） */
    val Log: ImageVector by lazy {
        dsIcon(
            "log",
            listOf(
                DsPath("M14 2.5 H6.5 A1.5 1.5 0 0 0 5 4 v16 a1.5 1.5 0 0 0 1.5 1.5 h11 A1.5 1.5 0 0 0 19 20 V7.5 z"),
                DsPath("M14 2.5 v5 h5"),
                DsPath("M8.5 13 h7 M8.5 16.5 h4.5"),
            ),
        )
    }

    /** #i-dl：下载（OTA / 预览记录） */
    val Dl: ImageVector by lazy {
        dsIcon(
            "dl",
            listOf(
                DsPath("M12 3.5 v11"),
                DsPath("M7.5 10 L12 14.5 L16.5 10"),
                DsPath("M4 17.5 v1.5 a1.5 1.5 0 0 0 1.5 1.5 h13 a1.5 1.5 0 0 0 1.5 -1.5 v-1.5"),
            ),
        )
    }

    /** #i-box：立方体（P006 路由无效空态） */
    val Box: ImageVector by lazy {
        dsIcon(
            "box",
            listOf(
                DsPath("M21 7.5 L12 2.5 L3 7.5 V16.5 L12 21.5 L21 16.5 z"),
                DsPath("M3 7.5 L12 12.5 L21 7.5 M12 12.5 V21.5"),
            ),
        )
    }
}
