import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/ble/command_queue.dart';

CommandItem item(String id, {String deviceId = 'D1'}) => CommandItem(
      id: id,
      deviceId: deviceId,
      serviceUuid: 'svc',
      characteristicUuid: 'chr',
      data: const [0x01],
      displayHex: '01',
    );

void main() {
  group('CommandQueue F009（同设备串行 / 深 16 / 单写 5s）', () {
    test('FIFO 串行：后一条必须等前一条完成', () async {
      final order = <String>[];
      final inFlight = <String>[];
      final queue = CommandQueue(
        sender: (cmd) async {
          inFlight.add(cmd.id);
          expect(inFlight.length, 1, reason: '同设备串行：同时只允许一条在途');
          await Future<void>.delayed(const Duration(milliseconds: 20));
          inFlight.remove(cmd.id);
          order.add(cmd.id);
        },
        intervalMs: 0,
      );
      queue.enqueueBatch([item('a'), item('b'), item('c')]);
      await Future<void>.delayed(const Duration(milliseconds: 300));
      expect(order, ['a', 'b', 'c']);
    });

    test('深度上限 16：第 17 条整批拒绝且不留半批', () {
      final queue = CommandQueue(sender: (cmd) async {}, intervalMs: 0);
      queue.pause(); // 冻结处理，纯测深度
      queue.enqueueBatch(List.generate(16, (i) => item('q$i')));
      expect(queue.pendingCount, 16);
      expect(queue.isFull, isTrue);
      expect(() => queue.enqueue(item('q16')), throwsStateError);
      // 批量超额整批拒绝
      expect(() => queue.enqueueBatch([item('x1'), item('x2')]),
          throwsStateError);
      expect(queue.pendingCount, 16, reason: '拒绝时不得部分入队');
      expect(queue.queue.where((c) => c.id.startsWith('x')), isEmpty);
    });

    test('默认参数即契约：深 16 / 单写 5s', () {
      final queue = CommandQueue(sender: (cmd) async {});
      expect(queue.maxDepth, 16);
      expect(queue.writeTimeout, const Duration(seconds: 5));
    });

    test('单写超时：挂死的 write 标记失败并放行下一条', () async {
      final failed = <String?>[];
      final done = <String>[];
      final queue = CommandQueue(
        sender: (cmd) async {
          if (cmd.id == 'hang') {
            // 永不完成的写
            return Completer<void>().future;
          }
          done.add(cmd.id);
        },
        intervalMs: 0,
        writeTimeout: const Duration(milliseconds: 40),
      );
      queue.onCommandError = (cmd) => failed.add(cmd.error);
      queue.enqueueBatch([item('hang'), item('next')]);
      await Future<void>.delayed(const Duration(milliseconds: 400));
      expect(done, ['next'], reason: '超时后队列必须继续');
      expect(failed, isNotEmpty);
      expect(failed.first, contains('写入超时'));
    });

    test('循环模板超过深度上限拒绝启动', () {
      final queue = CommandQueue(sender: (cmd) async {}, intervalMs: 0);
      expect(
          () => queue.startLoop(List.generate(17, (i) => item('l$i'))),
          throwsStateError);
      expect(queue.isLooping, isFalse);
    });

    test('跨设备并行：per-device 队列互不阻塞（F009 跨设备并行语义）', () async {
      final completed = <String>[];
      final queueA = CommandQueue(
        sender: (cmd) => Completer<void>().future, // A 设备写挂死
        intervalMs: 0,
        writeTimeout: const Duration(milliseconds: 200),
      );
      final queueB = CommandQueue(
        sender: (cmd) async => completed.add(cmd.id),
        intervalMs: 0,
      );
      queueA.enqueue(item('a1', deviceId: 'A'));
      queueB.enqueue(item('b1', deviceId: 'B'));
      await Future<void>.delayed(const Duration(milliseconds: 100));
      expect(completed, ['b1'], reason: '设备 A 的写不得阻塞设备 B 的队列');
    });
  });
}
