# 💻 桌面霸主阵地：Tauri & Electron 开发实战

Smart BLE 项目最大的突破之一，在于补齐了被无数蓝牙框架忽视的 **“全功能桌面端工具”**。您可以在 `apps/desktop/` 下看到两种截然不同的架构：

## 阵营双子星：我们为什么同时给两套？
1. **Electron** (推荐性能极客使用)：由于内置了庞大的 Node.js 与 Chromium 内核。它的底层包 `noble` 提供了市面上最强的桌级低功耗蓝牙读写自由度。如果内存不是问题，它是工业霸主。
2. **Tauri** (轻量级发烧友最爱)：用 Rust 代替 Node.js 的怪物。体积仅为 Electron 的 1/5 甚至更低。调用原生系统的 WebView，极其省电丝滑！由于我们为其打通了 Rust WebAssembly 桥接蓝牙驱动的功能，它的未来无量。

---

## 一、 Electron 实兵实战 (Node.js)

### 环境与启动
要想驱动底层硬件模块，您不能只有个没用的浏览器，您需要原生编译之力：
1. 你的电脑上必须装有 `Python 3` + `Visual Studio C++ Build Tools` (Windows) 或是完整的 `XCode 命令行库` (Mac)。这是用来编译硬件通讯组件 `noble` 的基石！
2. 终端切到 `apps/desktop/electron/`。
3. 执行：`npm install`，你会看到控制台疯狂冒出 C++ 编译警告，别管，只要最终编译完成即可。
4. 启动台：`npm start`。

* **注意事项**：在 Windows 系统上跑 Electron Bluetooth，需要确认你的蓝牙适配器使用了被微软推荐的 `WinUSB` 标准协议，一些过于老古董的非标接收器可能会在 Node 框架里导致设备搜索为 0。

---

## 二、 Tauri 实境降维打击 (Rust)

如果您想感受最极致前沿的技术栈，进入 `apps/desktop/tauri/` 。

### 启动准则
你必须有大神的玩具全家桶：
1. 装有最新版的 **Rust 工具链** (直接在终端跑 `rustc --version` 确定)。
2. Node.js 环境（为了供前端 WebView 展现那套跟全网对齐的暗黑美学 UI）。
3. 切入目录并执行 `npm install`。
4. 拉起！`cargo tauri dev`（或者 `npm run tauri dev`）。

### 我们底层的跨桥玄机
如果您想二开底层读取流，去改 `src-tauri/src/lib.rs`！你会惊叹我们在 Rust 层做的数据代理是如此的高效。在界面（前端 UI）与生铁般的机器（Rust 后端）之间，我们将最核心的指令过滤机制下发回了前端的那块 `desktop-shared/BleUtils.js` 中。

在这里修改了界面颜色体系（通过全项目脚本分发），你甚至可以直接在 Tauri 开启的状态下体验 **热重载渲染 (Hot Reloading)**！界面瞬间在你的电脑桌面变色易容。
