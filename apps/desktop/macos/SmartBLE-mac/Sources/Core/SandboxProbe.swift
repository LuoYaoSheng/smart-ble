// SandboxProbe.swift — r5 上架就绪：验证 app-sandbox entitlement 是否真实生效
//
// 仅 --sandbox-probe 启动时运行：尝试向沙盒容器外的 /Users/Shared 写探针文件。
//   写失败 ⇒ 沙盒生效（sandbox=ON，exit 0）
//   写成功 ⇒ 沙盒未生效（sandbox=OFF，exit 3）——用于区分“签了 entitlement 但内核未执行”的假阳性
// 附带打印 NSHomeDirectory()：沙盒内为容器路径（~/Library/Containers/...），沙盒外为真实用户主目录。
import AppKit

@MainActor
enum SandboxProbe {
    nonisolated static func runIfRequested() {
        guard CommandLine.arguments.contains("--sandbox-probe") else { return }

        let probePath = "/Users/Shared/smartble-sandbox-probe.txt"
        var writeBlocked = false
        do {
            try "sandbox-probe".data(using: .utf8)!.write(to: URL(fileURLWithPath: probePath))
            try? FileManager.default.removeItem(atPath: probePath)
        } catch {
            writeBlocked = true
        }

        print("[SANDBOX-PROBE] home=\(NSHomeDirectory())")
        print("[SANDBOX-PROBE] write-outside-container=\(writeBlocked ? "blocked" : "ALLOWED")")
        print("[SANDBOX-PROBE] sandbox=\(writeBlocked ? "ON (entitlement 已被内核执行)" : "OFF (entitlement 未生效)")")
        exit(writeBlocked ? 0 : 3)
    }
}
