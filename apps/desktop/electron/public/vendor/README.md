# vendor/

第三方前端依赖（桌面双线 E-WIN/T-WIN 字节镜像，勿手改）。

## jsQR.js — QR 码解码（P002 配对码摄像头扫码主路径，10_platform §2.4）

- 来源：npm 包 `jsqr@1.4.0` 的 `dist/jsQR.js`（UMD，浏览器侧挂 `window.jsQR`；运行时按需动态注入，不改启动加载链）
- 许可：Apache License 2.0（全文见 `jsQR-LICENSE.txt`）
- 升级方式：`npm pack jsqr --registry https://registry.npmmirror.com` → 取 `package/dist/jsQR.js` 双线同贴，并同步本注记版本号
