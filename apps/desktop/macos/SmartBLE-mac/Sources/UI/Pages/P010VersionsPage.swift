//
// P010VersionsPage.swift — PAGE010 版本记录（F027 构建元数据投影 · 探针口径）
// 当前限制 = r3 实测限制清单（BLOCKED_FIXTURE / BLOCKED_OBSERVER / 单连接 / P-03 / NOT_RUN 项）；
// 预览记录 = spike 轮次；正式发布历史 = 空态。页脚固定声明。
//

import AppKit

@MainActor
final class P010VersionsPage: NSViewController, PageProtocol {
    weak var host: PageHost?
    private var scroll: PageScroll!

    /// 当前限制（探针实测口径 · verification r3）
    private let limitations: [(String, String)] = [
        ("warn", "GATT 正向链 BLOCKED_FIXTURE：无可连接夹具（ESP32 GATT server），读写监听仅经真实连接验证到发现失败分支"),
        ("warn", "E5 外部可见性 BLOCKED_OBSERVER：无第二观察端，广播仅本地 API 成功口径"),
        ("warn", "多设备并行会话未支持：BLEManager 单连接（共享层能力，Windows 主线）"),
        ("warn", "OTA 端到端链路 BLOCKED（P-03）：固件侧暂未开放升级通道"),
        ("warn", "P002 摄像头扫码 NOT_RUN：探针未实现二维码识别，配对码走桌面粘贴兜底路径"),
    ]

    /// 预览记录（spike 轮次投影）
    private let previews: [(String, String, String, String)] = [
        ("v0.1.0-spike r3", "2026-09-04", "页面按平台原型对齐（四 Tab + 9 页 + 桌面差异点）", "r3"),
        ("v0.1.0-spike r2", "2026-09-04", "页面级覆盖（原生 11/11 + Flutter 探针 8/8）· D16/D17", "c6fc88d"),
        ("v0.1.0-spike r1", "2026-09-03", "macOS 平台层验证（构建/权限/插件能力）· D1-D15", "f9a4516"),
    ]

    init(host: PageHost) {
        self.host = host
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func loadView() {
        scroll = PageScroll()
        view = scroll
        view.wantsLayer = true
        view.layer?.backgroundColor = DS.bg.cgColor
    }

    func rebuild() {
        guard let host else { return }
        var views: [NSView] = []
        views.append(subnav(title: "版本记录", onBack: { [weak self] in
            self?.host?.router.back()
        }))

        // 当前版本卡
        let verCard = Card()
        verCard.setViews([
            sectionTitle("doc", "当前版本"),
            hstack([makeLabel(DS.probeVersion, size: 24, weight: .heavy, color: DS.primary),
                    chip(DS.probeChannel, tone: "primary")], spacing: 10),
            kvRow("构建", "\(DS.probeVersion)（\(DS.probeBranch)）", mono: true),
            kvRow("Release tag", "已登记（preview）"),
            hstack([chip("微信小程序 PREVIEW", tone: "primary"), chip("桌面端 NOT_RELEASED", tone: "danger")], spacing: 6),
            DSButton("复制版本信息", tone: .soft, small: true, symbol: "doc.on.doc", actionId: "p010-copy") { [weak self] in
                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString("\(DS.probeVersion) · \(DS.probeChannel) · \(DS.probeBranch)", forType: .string)
                self?.host?.toast("版本已复制", ok: true)
            },
        ], spacing: 9)
        views.append(verCard)

        // 当前限制卡（实测限制清单）
        let limitCard = Card()
        limitCard.setViews([sectionTitle("exclamationmark.triangle", "当前限制")]
            + limitations.map { kind, text in
                let row = hstack([
                    makeIcon(kind == "warn" ? "exclamationmark.triangle.fill" : "info.circle.fill", color: DS.warningDeep, size: 12),
                    makeLabel(text, size: 13, color: DS.sub),
                ], spacing: 8, alignment: .top)
                row.translatesAutoresizingMaskIntoConstraints = false
                return row
            } + [noteBanner("info", "当前无 Artifact，不提供下载入口。")], spacing: 8)
        views.append(limitCard)

        // 正式发布历史（空态）
        let relCard = Card()
        relCard.setViews([
            sectionTitle("checkmark", "正式发布历史"),
            emptyState(symbol: "doc", title: "暂无正式发布版本",
                       desc: "产品当前处于 PREVIEW 阶段，首个正式版发布后将在此列出。"),
        ], spacing: 8)
        views.append(relCard)

        // 预览记录（spike 轮次）
        let prevCard = Card()
        prevCard.setViews([sectionTitle("arrow.down.circle", "预览记录")]
            + previews.map { v, date, note, sha in
                hstack([
                    makeLabel("\(v)  ", size: 13, weight: .semibold),
                    makeLabel("\(date) · \(note)", size: 11, color: DS.mut),
                    NSView(),
                    makeLabel(sha, size: 12, color: DS.mut, mono: true),
                ], spacing: 8)
            }, spacing: 9)
        views.append(prevCard)

        let foot = makeLabel("本页数据来自 Release Metadata 投影，不是手写版本事实源。\n桌面探针（\(DS.probeBranch)）· D2 选型未定，不预判实现技术。", size: 11, color: DS.ph, align: .center)
        foot.maximumNumberOfLines = 0
        views.append(foot)

        scroll.setViews(views)
    }
}
