// AppIconRender.swift — r5 上架就绪：把满幅方形品牌原图 macOS 化
// 1024 画布 / 内容 824×824 居中（Apple 图标网格）/ 连续感圆角 r=185 / 透明边距 / 内缘高光。
// 用法: swift AppIconRender.swift <input.png> <output.png>
import AppKit

let args = CommandLine.arguments
guard args.count == 3 else {
    FileHandle.standardError.write("usage: swift AppIconRender.swift <input.png> <output.png>\n".data(using: .utf8)!)
    exit(64)
}
let inputURL = URL(fileURLWithPath: args[1])
let outputURL = URL(fileURLWithPath: args[2])

guard let source = NSImage(contentsOf: inputURL) else {
    FileHandle.standardError.write("cannot load \(args[1])\n".data(using: .utf8)!)
    exit(65)
}

let canvas = 1024.0
let body = 824.0            // Apple macOS 图标网格内容区（824/1024 ≈ 80.5%）
let margin = (canvas - body) / 2
let radius = 185.0          // 824 体量下 ≈22.4% 圆角半径（squircle 观感）

guard let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(canvas), pixelsHigh: Int(canvas),
                                 bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                 colorSpaceName: NSColorSpaceName.deviceRGB, bytesPerRow: 0, bitsPerPixel: 0) else {
    FileHandle.standardError.write("bitmap alloc failed\n".data(using: .utf8)!)
    exit(66)
}
rep.size = NSSize(width: canvas, height: canvas)

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
NSGraphicsContext.current?.imageInterpolation = .high

let bodyRect = NSRect(x: margin, y: margin, width: body, height: body)
NSBezierPath(roundedRect: bodyRect, xRadius: radius, yRadius: radius).addClip()

// 品牌原图铺满圆角体
source.draw(in: bodyRect, from: .zero, operation: .sourceOver, fraction: 1.0)

// 内缘高光：贴圆角内侧的半透明白描边（浅色 Dock 下的边缘可辨性）
let stroke = NSBezierPath(roundedRect: bodyRect.insetBy(dx: 1.5, dy: 1.5),
                          xRadius: radius - 1.5, yRadius: radius - 1.5)
stroke.lineWidth = 3.0
NSColor(calibratedWhite: 1.0, alpha: 0.18).setStroke()
stroke.stroke()

NSGraphicsContext.restoreGraphicsState()

guard let png = rep.representation(using: NSBitmapImageRep.FileType.png, properties: [:]) else {
    FileHandle.standardError.write("png encode failed\n".data(using: .utf8)!)
    exit(67)
}
try! png.write(to: outputURL)
print("APPICON_RENDER_OK \(outputURL.path) \(Int(canvas))x\(Int(canvas)) body=\(Int(body)) radius=\(Int(radius))")
