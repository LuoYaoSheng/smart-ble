using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

namespace SmartBLE.Desktop.ViewModels;

// F027 版本元数据投影（V-WIN 对齐层）：数据源为 generate-release-metadata.mjs 管线产物
// apps/desktop/electron/public/config/release-metadata.generated.js —— 本工程 Assets 下
// 携带其字节镜像（Assets/release-metadata.js），开发运行时优先读仓库内电子壳副本，
// 打包运行回退镜像。口径与 version-metadata.js（uniapp 锁定镜像）一致：纯投影，
// 禁止手写版本事实。
public static class ReleaseMetadata
{
    public sealed record Surface(string Key, string Name, string Role,
        string CapabilityStatus, string ReleaseStatus);

    public sealed record Model(
        string Channel,
        string AppVersion,
        string? Commit,
        string? BuiltAt,
        string OverallStatus,
        string? ReleaseTag,
        string[] KnownLimitations,
        List<Surface> Surfaces)
    {
        public string Sha7 => Commit is { Length: >= 7 } c ? c[..7] : "";

        public string DisplayVersion => BuildVersionString(AppVersion, Commit, Channel);

        public string ChannelLabel => Channel == "release" ? "Release" : "Preview";

        public IEnumerable<Surface> PlatformStatuses => Surfaces
            .Where(s => s.Key is "android" or "wechat" or "h5" or "ios" or "flutter_tauri_native"
                or "peripheral" or "observer");

        public IEnumerable<Surface> VersionPagePlatforms => Surfaces
            .Where(s => s.Key is "android" or "wechat" or "h5" or "ios");

        public (string version, string builtAt, string sha)[] HistoryReleases
        {
            get
            {
                var hasTag = !string.IsNullOrWhiteSpace(ReleaseTag);
                if (!hasTag)
                    return Array.Empty<(string, string, string)>();
                return new[] { (AppVersion, BuiltAt ?? "", Sha7) };
            }
        }

        public (string version, string channel, string status)[] HistoryPreviews
        {
            get
            {
                if (string.IsNullOrWhiteSpace(AppVersion) ||
                    (Channel != "preview" && Channel != "dev"))
                    return Array.Empty<(string, string, string)>();
                return new[] { (AppVersion, Channel, OverallStatus) };
            }
        }
    }

    // version-metadata.js buildVersionString 同口径：release → v+sha；preview/dev → v-dev.sha
    public static string BuildVersionString(string? version, string? commit, string? channel)
    {
        var v = (version ?? "").Trim();
        if (v.Length == 0) return "dev.unknown";
        var ch = (channel ?? "preview").ToLowerInvariant();
        var sha = commit is { Length: >= 7 } c ? c[..7] : "";
        if (ch == "release") return sha.Length > 0 ? $"{v}+{sha}" : v;
        return sha.Length > 0 ? $"{v}-dev.{sha}" : $"{v}-dev.unknown";
    }

    private sealed record RawMeta(
        string? channel,
        string? app_version,
        string? commit,
        string? built_at,
        string? overall_status,
        string? release_tag,
        List<string>? known_limitations,
        Dictionary<string, RawSurface>? public_surfaces);

    private sealed record RawSurface(
        string? name, string? role, string? capability_status, string? release_status);

    public static Model Load()
    {
        foreach (var candidate in CandidatePaths())
        {
            try
            {
                if (!File.Exists(candidate)) continue;
                var meta = ParseJsAssignment(File.ReadAllText(candidate));
                if (meta != null) return meta;
            }
            catch
            {
                // 逐候选路径独立失败：开发树缺文件/占用等，继续回退
            }
        }

        try
        {
            using var stream = Avalonia.Platform.AssetLoader.Open(
                new Uri("avares://SmartBLE.Desktop/Assets/release-metadata.js"));
            using var reader = new StreamReader(stream);
            var meta = ParseJsAssignment(reader.ReadToEnd());
            if (meta != null) return meta;
        }
        catch
        {
            // 镜像缺失 → dev.unknown 兜底
        }

        return Empty;
    }

    public static readonly Model Empty = new(
        "preview", "", null, null, "PREVIEW", null,
        Array.Empty<string>(), new List<Surface>());

    private static IEnumerable<string> CandidatePaths()
    {
        // 开发运行（dotnet run / bin 调试）：向上找仓库内电子壳的管线产物
        var dir = AppContext.BaseDirectory;
        for (var i = 0; i < 8 && dir != null; i++)
        {
            yield return Path.Combine(dir,
                "electron", "public", "config", "release-metadata.generated.js");
            dir = Path.GetDirectoryName(dir.TrimEnd(Path.DirectorySeparatorChar));
        }
    }

    // release-metadata.generated.js 形如 `window.RELEASE_METADATA = { … };`
    private static Model? ParseJsAssignment(string js)
    {
        var assign = js.IndexOf("window.RELEASE_METADATA", StringComparison.Ordinal);
        if (assign < 0) return null;
        var start = js.IndexOf('{', assign);
        if (start < 0) return null;
        var depth = 0;
        var end = -1;
        for (var i = start; i < js.Length; i++)
        {
            if (js[i] == '{') depth++;
            else if (js[i] == '}')
            {
                depth--;
                if (depth == 0) { end = i; break; }
            }
        }
        if (end < 0) return null;

        var raw = JsonSerializer.Deserialize<RawMeta>(
            js.Substring(start, end - start + 1),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (raw == null) return null;

        var surfaces = new List<Surface>();
        foreach (var (key, s) in raw.public_surfaces ?? new Dictionary<string, RawSurface>())
        {
            surfaces.Add(new Surface(
                key, s?.name ?? key, s?.role ?? "", s?.capability_status ?? "",
                s?.release_status ?? ""));
        }

        return new Model(
            (raw.channel ?? "preview").ToLowerInvariant(),
            raw.app_version ?? "",
            raw.commit,
            raw.built_at,
            raw.overall_status ?? "PREVIEW",
            raw.release_tag,
            raw.known_limitations?.ToArray() ?? Array.Empty<string>(),
            surfaces);
    }
}
