package com.smartble.core.profile

/*
 * 产品级跨语言向量 parity 执行器（Kotlin 线，MAC-008）。
 *
 * 单源向量：core/protocols/ble-product-v1-vectors.json（与 JS/Dart 消费同一文件，
 * 由 scripts/check-product-parity.mjs kotlin 车道经 gradle 调用本测试）。
 * 覆盖：logRedaction（F026 Kotlin 锁定镜像，apps/…/core/utils/LogRedaction.kt）。
 * otaTargets/otaSemVer 为 js/swift 交集，Kotlin 未声明。
 *
 * 结果双出口（对齐 SmartHidVectorParityTest 约定）：
 *   1) apps/android/app/build/product-parity-kotlin.json（PRODUCT_PARITY_OUT 可覆盖）
 *   2) stdout @@PARITY@@ 行。
 */

import com.smartble.core.utils.LogRedaction
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class ProductVectorParityTest {

    private class Failure(val suite: String, val id: String, val detail: String)

    @Test
    fun `product vectors parity`() {
        val vectorsFile = resolveVectorsFile()
        val suites = JSONObject(vectorsFile.readText()).getJSONObject("suites")

        val failures = mutableListOf<Failure>()
        var pass = 0
        fun check(suite: String, id: String, ok: Boolean, detail: String = "") {
            if (ok) pass += 1 else failures += Failure(suite, id, detail)
        }

        val logRedaction = suites.optJSONObject("logRedaction") ?: JSONObject().put("cases", JSONArray())
        val cases = logRedaction.getJSONArray("cases")
        for (i in 0 until cases.length()) {
            val c = cases.getJSONObject(i)
            val input = c.getString("input")
            val expected = c.getString("expect")
            val got = LogRedaction.sanitizeLogString(input) ?: input
            check("logRedaction", c.getString("id"), got == expected, "input=$input got=$got expect=$expected")
        }

        val report = JSONObject().apply {
            put("pass", pass)
            put("fail", failures.size)
            put("failures", JSONArray(failures.map {
                JSONObject().put("suite", it.suite).put("case", it.id).put("detail", it.detail)
            }))
        }
        writeResult(report)
        println("@@PARITY@@ $report")
        assertTrue("向量失败：$failures", failures.isEmpty())
    }

    /** 与 SmartHidVectorParityTest 同法：从 user.dir 逐级上溯找仓库根 */
    private fun resolveVectorsFile(): File {
        env("PRODUCT_VECTORS")?.let { return File(it) }
        var dir: File? = File(System.getProperty("user.dir")).absoluteFile
        repeat(8) {
            val d = dir ?: return@repeat
            val cand = File(d, "core/protocols/ble-product-v1-vectors.json")
            if (cand.isFile) return cand
            dir = d.parentFile
        }
        throw IllegalStateException(
            "ble-product-v1-vectors.json 未找到（from ${System.getProperty("user.dir")}，可设 PRODUCT_VECTORS 指定）",
        )
    }

    private fun writeResult(report: JSONObject) {
        val out: File = env("PRODUCT_PARITY_OUT")?.let { File(it) }
            ?: run {
                // vectorsFile = <root>/core/protocols/ble-product-v1-vectors.json → root
                val root = resolveVectorsFile().parentFile?.parentFile?.parentFile
                File(root, "apps/android/app/build/product-parity-kotlin.json")
            }
        out.parentFile?.mkdirs()
        out.writeText(report.toString())
    }

    private fun env(key: String): String? =
        try { System.getenv(key) } catch (_: Exception) { null }
}
