# Smart BLE BLE FAQ

> 给第一次接触 BLE 和第一次进入 `Smart BLE` 的学习者。

---

## 先从哪个入口开始？

最推荐先从：

- `BLE Toolkit+（Smart BLE 小程序版）`

因为它最容易先体验，不需要先理解所有实现差异。

---

## Smart BLE 和 BLE Toolkit+ 是什么关系？

- `Smart BLE`：总项目名
- `BLE Toolkit+`：小程序当前对外名称

你可以把 `BLE Toolkit+` 理解成：

> Smart BLE 最适合第一次进入的体验入口。

---

## LightBLE 又是什么？

`LightBLE` 是历史命名和旧仓库线。

现在新的主入口已经统一到：

- `lys-smart-ble`

---

## 第一次学 BLE，最先要会什么？

先学 4 个动作：

1. 扫描设备
2. 连接设备
3. 查看服务和特征值
4. 读写特征值

把这 4 个动作跑通之后，再去看协议和平台差异。

---

## 我应该先看小程序、Flutter 还是 Tauri？

看你的目标：

- 想最快上手：小程序
- 想学跨平台移动：Flutter
- 想学桌面工具：Tauri

---

## 为什么仓库里有这么多实现？

因为 `Smart BLE` 不是单一技术栈项目，而是一个多平台产品家族。

这些实现同时承担：

- 工具入口
- 教学对照
- 平台能力验证
- 历史演进保留

---

## 我需要一开始就看源码吗？

不需要。

更好的顺序通常是：

1. 先体验
2. 再看快速入门和 FAQ
3. 再看平台选择和差异
4. 最后再回仓库看实现

---

## 下一步看什么？

- [Start Here](./START_HERE.md)
- [平台选择指南](./PLATFORM_SELECTION.md)
- [BLE 协议](./03-ble-protocol.md)
