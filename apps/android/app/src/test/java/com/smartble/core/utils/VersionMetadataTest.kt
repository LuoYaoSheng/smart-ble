package com.smartble.core.utils

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * F027 版本元数据——uniapp `services/version-metadata.js` 的 Kotlin 锁定镜像向量。
 * 与 apps/flutter `version_metadata_test.dart` 同向量组；
 * 注入向量与 tests/target/unit/version-page-model-target.test.mjs 对齐。
 */
class VersionMetadataTest {

    @Test
    fun v1_missingVersionFallsToDevUnknown() {
        assertEquals("dev.unknown", VersionMetadata.buildVersionString(null, null, null))
        assertEquals("dev.unknown", VersionMetadata.buildVersionString("  ", null, null))
        assertEquals("dev.unknown", VersionMetadata.buildVersionString("", null, null))
    }

    @Test
    fun v2_releaseChannelVersionPlusSha() {
        assertEquals(
            "1.0.5+abcdef0",
            VersionMetadata.buildVersionString("1.0.5", "abcdef012345", "release"),
        )
        assertEquals("1.0.5", VersionMetadata.buildVersionString("1.0.5", null, "release"))
    }

    @Test
    fun v3_previewChannelDevSha() {
        assertEquals(
            "1.0.5-dev.abcdef0",
            VersionMetadata.buildVersionString("1.0.5", "abcdef012345", "preview"),
        )
        assertEquals("1.0.5-dev.unknown", VersionMetadata.buildVersionString("1.0.5", null, null))
    }

    @Test
    fun v4_shortShaTrimsAndTakes7() {
        assertEquals(
            "1.0.0+abc1234",
            VersionMetadata.buildVersionString("1.0.0", "  abc123456789  ", "release"),
        )
        assertEquals(
            "1.0.0-dev.unknown",
            VersionMetadata.buildVersionString("1.0.0", "   ", "preview"),
        )
    }

    @Test
    fun v5_channelCaseInsensitive() {
        assertEquals(
            "1.0.5+abc1234",
            VersionMetadata.buildVersionString("1.0.5", "abc1234", "RELEASE"),
        )
    }

    @Test
    fun g1_generatedMirrorMatchesCanonFacts() {
        assertEquals("1.0", VersionMetadata.releaseMetadata()["schema_version"])
        assertEquals("1.0.5", VersionMetadata.productVersion())
        assertEquals(101, VersionMetadata.releaseMetadata()["app_build_code"])
        assertEquals("preview", VersionMetadata.releaseMetadata()["channel"])
        assertEquals("PREVIEW", VersionMetadata.releaseMetadata()["overall_status"])
    }

    @Test
    fun g2_capabilityStatusesHonest() {
        val caps = VersionMetadata.capabilityPublicStatuses()
        assertEquals(listOf("ota", "smart_hid"), caps.map { it.key })
        assertEquals("BLOCKED", caps[0].capabilityStatus)
        assertTrue(caps[0].reason != null)
        assertEquals("PREVIEW", caps[1].capabilityStatus)
    }

    @Test
    fun g3_platformSevenKeysAndReferenceRole() {
        val platforms = VersionMetadata.platformPublicStatuses()
        assertEquals(
            listOf(
                "android", "wechat", "h5", "ios",
                "flutter_tauri_native", "peripheral", "observer",
            ),
            platforms.map { it.key },
        )
        val reference = platforms.first { it.key == "flutter_tauri_native" }
        assertEquals("REFERENCE", reference.role)
        assertNull(reference.capabilityStatus)
    }

    @Test
    fun g4_p009FallbackLabel() {
        assertEquals("1.0.5-dev.unknown", VersionMetadata.metadataVersionLabel())
    }

    @Test
    fun m1_defaultMetadataDrivesCurrentCard() {
        val model = VersionMetadata.versionPageModel()
        assertEquals("1.0.5", model.current.version)
        assertEquals("PREVIEW", model.current.status)
        assertEquals("preview", model.current.channel)
        assertEquals("Preview", model.current.channelLabel)
        assertTrue(!model.current.hasArtifacts)
        assertTrue(!model.current.hasReleaseTag)
        assertTrue(model.current.limitations.size >= 8)
        assertEquals("Android 正式 APK 尚未发布", model.current.limitations.first())
        assertEquals(
            listOf("android", "wechat", "h5", "ios"),
            model.current.platforms.map { it.key },
        )
        assertEquals("UNSUPPORTED", model.current.platforms.first { it.key == "h5" }.capabilityStatus)
        assertEquals(
            "NOT_RELEASED",
            model.current.platforms.first { it.key == "android" }.releaseStatus,
        )
    }

    @Test
    fun m2_previewInjectedModelMatchesCanonVector() {
        val preview = VersionMetadata.versionPageModel(
            mapOf(
                "app_version" to "1.0.5",
                "channel" to "preview",
                "overall_status" to "PREVIEW",
                "release_tag" to null,
                "commit" to null,
                "built_at" to null,
                "artifacts" to emptyList<Any?>(),
                "known_limitations" to listOf("Android 正式 APK 尚未发布", "OTA 当前 BLOCKED"),
                "public_surfaces" to mapOf(
                    "android" to mapOf(
                        "name" to "UniApp Android", "role" to "mainline",
                        "capability_status" to "PREVIEW", "release_status" to "NOT_RELEASED",
                    ),
                    "wechat" to mapOf(
                        "name" to "WeChat", "role" to "mainline",
                        "capability_status" to "PREVIEW", "release_status" to "NOT_RELEASED",
                    ),
                    "h5" to mapOf(
                        "name" to "H5", "role" to "degradation",
                        "capability_status" to "UNSUPPORTED", "release_status" to "NOT_RELEASED",
                    ),
                    "ios" to mapOf(
                        "name" to "iOS", "role" to "future",
                        "capability_status" to "NOT_RELEASED", "release_status" to "NOT_RELEASED",
                    ),
                ),
            )
        )

        assertEquals("1.0.5", preview.current.version)
        assertEquals("PREVIEW", preview.current.status)
        assertEquals("preview", preview.current.channel)
        assertTrue(!preview.current.hasArtifacts)
        assertTrue(!preview.current.hasReleaseTag)
        assertTrue(preview.history.releases.isEmpty())
        assertEquals(1, preview.history.previews.size)
        assertEquals("1.0.5 Preview", preview.history.previews[0].label)
        assertTrue(preview.current.limitations.any { it.contains("APK") })
        assertTrue(
            preview.current.platforms.any { it.key == "android" && it.releaseStatus == "NOT_RELEASED" }
        )
        assertTrue(
            preview.current.platforms.any { it.key == "h5" && it.capabilityStatus == "UNSUPPORTED" }
        )
    }

    @Test
    fun m3_releaseInjectedModelProducesVerifiedHistory() {
        val released = VersionMetadata.versionPageModel(
            mapOf(
                "app_version" to "1.0.5",
                "channel" to "release",
                "overall_status" to "VERIFIED",
                "release_tag" to "v1.0.5",
                "commit" to "abcdef012345",
                "built_at" to "2026-09-01T00:00:00Z",
                "artifacts" to listOf(
                    mapOf(
                        "kind" to "apk", "version" to "1.0.5",
                        "url" to "https://example.test/a.apk",
                        "sha256" to "a".repeat(64), "size" to 1,
                    )
                ),
                "known_limitations" to emptyList<String>(),
                "public_surfaces" to mapOf(
                    "android" to mapOf(
                        "name" to "Android", "role" to "mainline",
                        "capability_status" to "VERIFIED", "release_status" to "VERIFIED",
                    ),
                ),
            )
        )

        assertEquals(1, released.history.releases.size)
        assertEquals("v1.0.5", released.history.releases[0].tag)
        assertEquals("VERIFIED", released.history.releases[0].status)
        assertTrue(released.current.hasArtifacts)
        assertTrue(released.current.hasReleaseTag)
        assertEquals("Release", released.current.channelLabel)
        assertEquals("1.0.5+abcdef0", released.current.displayVersion)
        assertTrue(released.history.previews.isEmpty())
    }

    @Test
    fun m4_emptyMetadataFallsBackSafely() {
        val empty = VersionMetadata.versionPageModel(emptyMap())
        assertEquals("", empty.current.version)
        assertEquals("dev.unknown", empty.current.displayVersion)
        assertEquals("preview", empty.current.channel)
        assertEquals("PREVIEW", empty.current.status)
        assertTrue(empty.current.limitations.isEmpty())
        assertTrue(empty.current.platforms.isEmpty())
        assertTrue(empty.history.releases.isEmpty())
        assertTrue(empty.history.previews.isEmpty())
    }

    @Test
    fun m5_injectionDoesNotPolluteGlobal() {
        VersionMetadata.versionPageModel(
            mapOf("app_version" to "9.9.9", "channel" to "release")
        )
        assertEquals("1.0.5", VersionMetadata.productVersion())
        assertEquals("1.0.5", VersionMetadata.versionPageModel().current.version)
    }
}
