// provisioning_framing.dart 单测 —— 与 core/ble-core framing.js 语义对齐
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/ble/provisioning_framing.dart';

void main() {
  group('chunkSizeForMtu', () {
    test('MTU 23 → 17B；MTU 247 → 封顶 128B', () {
      expect(chunkSizeForMtu(23), 17);
      expect(chunkSizeForMtu(247), 128);
      expect(chunkSizeForMtu(517), 128);
    });

    test('中间值 = MTU-6；非法值按 23 兜底', () {
      expect(chunkSizeForMtu(50), 44);
      expect(chunkSizeForMtu(-1), 17);
      expect(chunkSizeForMtu(0), 17);
    });
  });

  group('buildFrames', () {
    test('单帧：[seq=0][total=1][len][payload]', () {
      final frames = buildFrames([1, 2, 3], 128);
      expect(frames.length, 1);
      expect(frames[0], [0, 1, 3, 1, 2, 3]);
    });

    test('多帧按块切分，seq/total/len 头正确', () {
      final payload = List<int>.generate(300, (i) => i & 0xFF);
      final frames = buildFrames(payload, 128);
      expect(frames.length, 3);
      expect(frames[0][0], 0);
      expect(frames[0][1], 3);
      expect(frames[0][2], 128);
      expect(frames[1], hasLength(131));
      expect(frames[1][0], 1);
      expect(frames[2][2], 300 - 256);
      // 重组 == 原始
      final flat = <int>[];
      for (final f in frames) {
        flat.addAll(f.sublist(frameHeaderSize));
      }
      expect(flat, payload);
    });

    test('空 payload / 超 1024B / 超帧数上限抛错', () {
      expect(() => buildFrames([], 128), throwsFormatException);
      expect(() => buildFrames(List.filled(1025, 1), 128), throwsFormatException);
      expect(() => buildFrames(List.filled(65, 1), 1), throwsFormatException);
      expect(() => buildFrames(List.filled(64, 1), 1), returnsNormally);
    });
  });

  group('FrameAssembler', () {
    test('顺序喂帧可还原原始 payload', () {
      final payload =
          utf8Encode('{"v":1,"wifi_ssid":"MyWiFi","token":"x"}' * 3);
      final assembler = FrameAssembler();
      Uint8List? out;
      for (final frame in buildFrames(payload, 32)) {
        out = assembler.feed(frame);
      }
      expect(out, isNotNull);
      expect(utf8Decode(out!), utf8Decode(payload));
    });

    test('乱序/跳号抛错', () {
      final frames = buildFrames(List<int>.generate(100, (i) => i), 40);
      final assembler = FrameAssembler();
      assembler.feed(frames[0]);
      expect(() => assembler.feed(frames[2]), throwsFormatException);
    });

    test('seq=0 重新开始；传输中途 total 变化抛错', () {
      final frames = buildFrames(List<int>.generate(80, (i) => i), 40);
      final assembler = FrameAssembler();
      assembler.feed(frames[0]);
      expect(() => assembler.feed([1, 3, 40, ...List.filled(40, 9)]),
          throwsFormatException);
      // seq=0 重启新传输
      final fresh = buildFrames([7, 8, 9], 2);
      expect(assembler.feed(fresh[0]), isNull);
      expect(assembler.feed(fresh[1]), [7, 8, 9]);
    });

    test('len 与实际长度不符抛错；帧过短抛错', () {
      final assembler = FrameAssembler();
      expect(() => assembler.feed([0, 1, 5, 1]), throwsFormatException);
      expect(() => assembler.feed([0]), throwsFormatException);
    });
  });

  group('utf8 编解码往返', () {
    test('ASCII / 中文 / emoji 往返一致', () {
      for (final s in ['hello', '智慧配网-123', 'a😀b']) {
        expect(utf8Decode(utf8Encode(s)), s);
      }
    });
  });
}
