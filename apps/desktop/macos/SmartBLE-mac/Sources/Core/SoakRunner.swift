//
// SmartBLE Desktop for macOS - Scan Soak Runner (r4)
//
// `--soak-scans=N` 连续驱动 N 轮真实扫描会话：
// 每轮 startScan() → 等待 CoreBluetooth 实证的 5s 会话自动停止 → 轮间歇 1s。
// 断言：每轮进入/退出扫描态、日志条数不超上限（500）、驻留内存增量有界（< 64MB）。
// 输出 [SOAK] 结构化日志；退出码 = 失败数（蓝牙未上电 → SKIP，退出码 0，环境依赖不计失败）。
//

import Cocoa

@MainActor
enum SoakRunner {

    /// 入口：main.swift 在窗口显示后调用；非 --soak-scans 启动时无副作用
    nonisolated static func runIfRequested() {
        guard let arg = CommandLine.arguments.first(where: { $0.hasPrefix("--soak-scans=") }) else { return }
        let rounds = max(1, Int(arg.dropFirst("--soak-scans=".count)) ?? 6)
        print("[SOAK] mode=soak-scans rounds=\(rounds) app=SmartBLE-mac")
        fflush(stdout)
        Task { @MainActor in
            var found: MainWindowController?
            for _ in 0..<10 {
                found = NSApp.windows.compactMap { $0.windowController as? MainWindowController }.first
                if found != nil { break }
                try? await Task.sleep(nanoseconds: 300_000_000)
            }
            guard let controller = found else {
                print("[SOAK] FATAL result=FAIL detail=\"MainWindowController not found\"")
                fflush(stdout)
                exit(1)
            }
            await run(controller: controller, rounds: rounds)
        }
    }

    private static var failures = 0

    private static func check(_ ok: Bool, _ detail: String) {
        print("[SOAK] result=\(ok ? "PASS" : "FAIL") detail=\"\(detail)\"")
        if !ok { failures += 1 }
        fflush(stdout)
    }

    private static func run(controller: MainWindowController, rounds: Int) async {
        let ble = controller.ble

        // 等待中央管理器上电（最长 10s）；未就绪按环境依赖处理为 SKIP
        var btReady = false
        for _ in 0..<20 {
            if ble.btState == .on { btReady = true; break }
            try? await Task.sleep(nanoseconds: 500_000_000)
        }

        // --bt-report=<path>：把进程内 btState 落盘（沙盒内应写容器路径），供 LaunchServices
        // 启动的实例取回真实状态（open 启动时 stdout 不可见）
        if let arg = CommandLine.arguments.first(where: { $0.hasPrefix("--bt-report=") }) {
            let path = String(arg.dropFirst("--bt-report=".count))
            do {
                try "btState=\(ble.btState)\n".write(toFile: path, atomically: true, encoding: .utf8)
                print("[SOAK] bt-report 已写入 \(path)")
            } catch {
                print("[SOAK] bt-report 写入失败: \(error)")
            }
            fflush(stdout)
        }

        guard btReady else {
            print("[SOAK] result=SKIP detail=\"bluetooth not powered on (环境依赖，不计失败)\"")
            fflush(stdout)
            exit(0)
        }

        let memBefore = residentBytes()
        var completedRounds = 0

        for round in 1...rounds {
            ble.startScan()

            // 进入扫描态（≤3s）
            var scanning = false
            for _ in 0..<6 {
                if ble.isScanning { scanning = true; break }
                try? await Task.sleep(nanoseconds: 500_000_000)
            }
            if !scanning {
                check(false, "round \(round)/\(rounds): 未进入扫描态")
                break
            }

            // 等待 5s 会话自动停止（≤12s 余量）
            var stopped = false
            for _ in 0..<24 {
                if !ble.isScanning { stopped = true; break }
                try? await Task.sleep(nanoseconds: 500_000_000)
            }
            let listed = ble.discoveredDevices.count
            if !stopped {
                check(false, "round \(round)/\(rounds): 会话未在 12s 内自动停止 (listed=\(listed))")
                ble.stopScan()
                break
            }
            completedRounds += 1
            print("[SOAK] round=\(round)/\(rounds) auto-stopped listed_devices=\(listed) summary=\"\(ble.lastScanSummary)\"")
            fflush(stdout)

            try? await Task.sleep(nanoseconds: 1_000_000_000)
        }

        check(completedRounds == rounds, "全部 \(rounds) 轮完成（实际 \(completedRounds)）")
        check(ble.logs.count <= 500, "日志条数不超上限 500（当前 \(ble.logs.count)）")
        if let before = memBefore, let after = residentBytes() {
            let deltaMB = Double(after - before) / 1_048_576
            print("[SOAK] mem before=\(before / 1024)KB after=\(after / 1024)KB delta=\(String(format: "%.1f", deltaMB))MB")
            check(deltaMB < 64, "驻留内存增量 < 64MB（实测 \(String(format: "%.1f", deltaMB))MB）")
        } else {
            print("[SOAK] result=SKIP detail=\"task_info 不可用，跳过内存断言\"")
            fflush(stdout)
        }
        print("[SOAK] done failures=\(failures)")
        fflush(stdout)
        exit(Int32(failures))
    }

    /// 驻留内存（字节）；mach_task_basic_info 在 arm64 macOS 13 可用
    private nonisolated static func residentBytes() -> Int64? {
        var info = mach_task_basic_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info_data_t>.size / MemoryLayout<natural_t>.size)
        let kr = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
            }
        }
        return kr == KERN_SUCCESS ? Int64(info.resident_size) : nil
    }
}
