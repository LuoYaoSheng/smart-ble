package com.smartble.core.utils

import com.smartble.core.config.RELEASE_METADATA

/**
 * F027 版本元数据投影（PRD §5 F027 · R26 · DATA_MODEL「版本投影」）。
 *
 * uniapp `services/version-metadata.js` 的 Kotlin 锁定镜像：只读
 * com.smartble.core.config.RELEASE_METADATA（与 uniapp 产物出自同一确定性管线），
 * 无 IO / 网络。P009 关于页版本三态 = 运行时渠道成功 → 覆盖；失败 → 回退
 * Release Metadata 投影（verFallback）；元数据版本亦空 → "dev.unknown"。
 * P010 版本记录页 = [versionPageModel] 纯函数模型，不手写版本事实。
 */
object VersionMetadata {

    data class PlatformPublicStatus(
        val key: String,
        val name: String,
        val role: String,
        val capabilityStatus: String?,
        val releaseStatus: String,
    )

    data class CapabilityPublicStatus(
        val key: String,
        val name: String,
        val role: String,
        val capabilityStatus: String?,
        val releaseStatus: String,
        val reason: String?,
    )

    data class ReleaseRecord(
        val version: String,
        val tag: String,
        val channel: String,
        val status: String,
        val builtAt: String?,
        val commit: String?,
        val artifacts: List<Any?>,
    )

    data class PreviewRecord(
        val version: String,
        val label: String,
        val channel: String,
        val status: String,
    )

    data class Current(
        val version: String,
        val status: String,
        val channel: String,
        val channelLabel: String,
        val platforms: List<PlatformPublicStatus>,
        val limitations: List<String>,
        val hasReleaseTag: Boolean,
        val hasArtifacts: Boolean,
        val displayVersion: String,
    )

    data class History(
        val releases: List<ReleaseRecord>,
        val previews: List<PreviewRecord>,
    )

    data class PageModel(
        val current: Current,
        val history: History,
    )

    /** 仓库当前 Release Metadata（生成物，键序与 uniapp 产物一致）。 */
    fun releaseMetadata(): Map<String, Any?> = RELEASE_METADATA

    /** 元数据版本真值（根 VERSION 单源经生成管线投出）。 */
    fun productVersion(): String = str(RELEASE_METADATA["app_version"])

    /**
     * 版本串三态（正典 buildVersionString）：
     * 版本空 → "dev.unknown"；release 渠道 → v+sha（无 sha 裸版本）；
     * 其余渠道 → v-dev.sha（无 sha → v-dev.unknown）。
     */
    fun buildVersionString(version: String?, commit: String?, channel: String?): String {
        val v = version?.trim().orEmpty()
        if (v.isEmpty()) return "dev.unknown"

        val ch = (channel?.takeIf { it.isNotEmpty() } ?: "preview").lowercase()
        val sha = shortSha(commit)

        return if (ch == "release") {
            if (sha.isEmpty()) v else "$v+$sha"
        } else {
            if (sha.isEmpty()) "$v-dev.unknown" else "$v-dev.$sha"
        }
    }

    /** P009 运行时渠道失败时的回退基准（verFallback）。 */
    fun metadataVersionLabel(): String = buildVersionString(
        version = RELEASE_METADATA["app_version"] as? String,
        commit = RELEASE_METADATA["commit"] as? String,
        channel = RELEASE_METADATA["channel"] as? String,
    )

    /** 平台公开状态（顺序=正典 order 七键）。 */
    fun platformPublicStatuses(): List<PlatformPublicStatus> {
        val surfaces = surfaces()
        return listOf(
            "android", "wechat", "h5", "ios",
            "flutter_tauri_native", "peripheral", "observer",
        ).mapNotNull { key ->
            (surfaces[key] as? Map<*, *>)?.let { platformStatus(key, it) }
        }
    }

    /** 能力公开状态（ota BLOCKED / smart_hid PREVIEW 等如实展示）。 */
    fun capabilityPublicStatuses(): List<CapabilityPublicStatus> {
        val surfaces = surfaces()
        return listOf("ota", "smart_hid").mapNotNull { key ->
            (surfaces[key] as? Map<*, *>)?.let {
                CapabilityPublicStatus(
                    key = key,
                    name = str(it["name"]),
                    role = str(it["role"]),
                    capabilityStatus = it["capability_status"] as? String,
                    releaseStatus = str(it["release_status"]),
                    reason = it["reason"] as? String,
                )
            }
        }
    }

    /** 正典 platformDisplayStatus：REFERENCE 是角色直接展示；否则
     * capability → release → NOT_RELEASED 兜底。 */
    fun platformDisplayStatus(surface: Map<*, *>): String {
        if (surface["role"] == "REFERENCE") return "REFERENCE"
        val cap = str(surface["capability_status"])
        val rel = str(surface["release_status"])
        return when {
            cap.isNotEmpty() -> cap
            rel.isNotEmpty() -> rel
            else -> "NOT_RELEASED"
        }
    }

    /** P010 页面模型：纯函数，只消费 Release Metadata（可注入，便于测试）。 */
    fun versionPageModel(metadata: Map<String, Any?>? = null): PageModel {
        val meta = metadata ?: RELEASE_METADATA
        val version = str(meta["app_version"])
        val channel = ((meta["channel"] as? String)?.takeIf { it.isNotEmpty() } ?: "preview").lowercase()
        val status = (meta["overall_status"] as? String)?.takeIf { it.isNotEmpty() } ?: "PREVIEW"
        val surfaces = meta["public_surfaces"] as? Map<*, *> ?: emptyMap<Any?, Any?>()

        val platforms = listOf("android", "wechat", "h5", "ios").mapNotNull { key ->
            (surfaces[key] as? Map<*, *>)?.let { platformStatus(key, it) }
        }

        val limitations = (meta["known_limitations"] as? List<*>)?.map { it.toString() } ?: emptyList()
        val artifacts = (meta["artifacts"] as? List<*>) ?: emptyList<Any?>()
        val hasArtifacts = artifacts.isNotEmpty()
        val releaseTag = str(meta["release_tag"])
        val hasReleaseTag = releaseTag.isNotEmpty()

        val releases = if (hasReleaseTag && hasArtifacts) {
            listOf(
                ReleaseRecord(
                    version = version,
                    tag = releaseTag,
                    channel = "release",
                    status = "VERIFIED",
                    builtAt = meta["built_at"] as? String,
                    commit = meta["commit"] as? String,
                    artifacts = artifacts,
                )
            )
        } else {
            emptyList()
        }

        val previews = if (version.isNotEmpty() && (channel == "preview" || channel == "dev")) {
            listOf(
                PreviewRecord(
                    version = version,
                    label = "$version Preview",
                    channel = channel,
                    status = status,
                )
            )
        } else {
            emptyList()
        }

        return PageModel(
            current = Current(
                version = version,
                status = status,
                channel = channel,
                channelLabel = if (channel == "release") "Release" else "Preview",
                platforms = platforms,
                limitations = limitations,
                hasReleaseTag = hasReleaseTag,
                hasArtifacts = hasArtifacts,
                displayVersion = buildVersionString(
                    version = version,
                    commit = meta["commit"] as? String,
                    channel = channel,
                ),
            ),
            history = History(releases = releases, previews = previews),
        )
    }

    private fun platformStatus(key: String, surface: Map<*, *>): PlatformPublicStatus =
        PlatformPublicStatus(
            key = key,
            name = str(surface["name"]),
            role = str(surface["role"]),
            capabilityStatus = surface["capability_status"] as? String,
            releaseStatus = str(surface["release_status"]),
        )

    private fun surfaces(): Map<*, *> =
        RELEASE_METADATA["public_surfaces"] as? Map<*, *> ?: emptyMap<Any?, Any?>()

    private fun str(v: Any?): String = v?.toString()?.trim() ?: ""

    private fun shortSha(commit: String?): String {
        val t = commit?.trim().orEmpty()
        return if (t.isEmpty()) "" else t.take(7)
    }
}
