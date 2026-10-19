// 通用 BLE 配网分帧传输（纯逻辑，无平台依赖）
//
// 镜像 `core/ble-core/provisioning/framing.js`（其事实源为
// Smart-HID-Workspace protocols/ble/PROVISIONING_V1.md §3）。
// 不绑定 Smart HID——任何「大 payload 分多次写特征」的配网档案都可复用：
//
//   帧 = [seq:u8][total:u8][len:u8][payload:len 字节]
//
// 约定：
//   - seq 从 0 起，顺序递增；total = 总块数（1–maxFrames）
//   - 每块 payload ≤ maxChunkBytes；按协商 MTU 切小块同样合法
//   - 接收方收到 seq=0 视为新传输开始（出错可整体从 0 重发）
//   - 乱序/跳号由接收方丢弃报错；组装上限 maxAssembledBytes
library;

import 'dart:convert';
import 'dart:typed_data';

/// 帧头字节数：seq + total + len
const int frameHeaderSize = 3;

/// 每帧 payload 上限（字节）
const int maxChunkBytes = 128;

/// 组装后的总 payload 上限（字节）
const int maxAssembledBytes = 1024;

/// 最大帧数（保护上限）
const int maxFrames = 64;

/// 默认 ATT MTU（未协商成功时的保守值）
const int defaultAttMtu = 23;

/// 依据协商 MTU 计算安全的每帧 payload 尺寸。
/// ATT write 每次可发 (MTU-3) 字节，其中 3 字节是帧头，
/// 故 payload 上限为 MTU-3-3；同时不超过协议的 [maxChunkBytes]。
int chunkSizeForMtu(int mtu) {
  if (mtu < defaultAttMtu) return defaultAttMtu - frameHeaderSize - 3;
  final size = mtu - frameHeaderSize - 3;
  return size < 1 ? 1 : (size > maxChunkBytes ? maxChunkBytes : size);
}

/// 将完整 payload 切成帧数组（已带 [seq][total][len] 头）。
/// payload 为空 / 超过 [maxAssembledBytes] / 帧数超过 [maxFrames] 时抛错。
List<Uint8List> buildFrames(List<int> bytes, int chunkSize) {
  if (bytes.isEmpty) throw const FormatException('framing: empty payload');
  if (bytes.length > maxAssembledBytes) {
    throw FormatException(
        'framing: payload ${bytes.length}B exceeds ${maxAssembledBytes}B');
  }
  var chunk = chunkSize < 1 ? 1 : chunkSize;
  if (chunk > maxChunkBytes) chunk = maxChunkBytes;
  final total = (bytes.length / chunk).ceil();
  if (total > maxFrames) {
    throw FormatException('framing: needs $total frames > $maxFrames');
  }

  final frames = <Uint8List>[];
  for (var seq = 0; seq < total; seq++) {
    final off = seq * chunk;
    final len = (chunk < bytes.length - off) ? chunk : bytes.length - off;
    final frame = Uint8List(frameHeaderSize + len);
    frame[0] = seq;
    frame[1] = total;
    frame[2] = len;
    frame.setRange(frameHeaderSize, frameHeaderSize + len, bytes, off);
    frames.add(frame);
  }
  return frames;
}

/// 接收侧组装器（单测与桌面端调试用；手机侧组装发生在设备端）。
/// 语义与固件一致：seq=0 重启；乱序/跳号报错；超上限报错。
class FrameAssembler {
  FrameAssembler([this.maxBytes = maxAssembledBytes]);

  final int maxBytes;
  Uint8List? _buf;
  int _expect = 0;
  int _total = 0;
  int _written = 0;

  /// 喂入一帧；完整时返回组装结果，未完整返回 null，非法抛错
  Uint8List? feed(List<int> frame) {
    if (frame.length < frameHeaderSize) {
      throw const FormatException('framing: short frame');
    }
    final seq = frame[0];
    final total = frame[1];
    final len = frame[2];
    if (total < 1 || total > maxFrames) {
      throw FormatException('framing: bad total $total');
    }
    if (frame.length != frameHeaderSize + len) {
      throw const FormatException('framing: len mismatch');
    }
    if (seq == 0) {
      _buf = Uint8List(maxBytes);
      _expect = 0;
      _total = total;
      _written = 0;
    }
    final buf = _buf;
    if (buf == null) {
      throw const FormatException('framing: frame before start (seq!=0)');
    }
    if (seq != _expect) {
      throw FormatException('framing: out of order (expect $_expect, got $seq)');
    }
    if (total != _total) {
      throw const FormatException('framing: total changed mid-transfer');
    }
    if (_written + len > maxBytes) {
      throw const FormatException('framing: exceed max bytes');
    }
    buf.setRange(_written, _written + len, frame, frameHeaderSize);
    _written += len;
    _expect++;
    if (_expect == _total) {
      final out = Uint8List.sublistView(buf, 0, _written);
      _buf = null;
      return out;
    }
    return null;
  }
}

/// UTF-8 编解码（Dart 原生 dart:convert；JS 侧手写实现是小程序环境所迫）
Uint8List utf8Encode(String s) => Uint8List.fromList(utf8.encode(s));

String utf8Decode(List<int> bytes) => utf8.decode(bytes);
