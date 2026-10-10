import 'dart:async';

/// Bounds and serializes writes at the device boundary, including writes from
/// independent pages. Different device IDs have independent workers.
class DeviceWriteQueue {
  DeviceWriteQueue({this.maxDepth = 16});
  final int maxDepth;
  final Map<String, Future<void>> _tails = {};
  final Map<String, int> _depths = {};
  final Map<String, int> _generations = {};

  int depth(String deviceId) => _depths[deviceId] ?? 0;

  Future<T> run<T>(String deviceId, Future<T> Function() action) async {
    if (depth(deviceId) >= maxDepth) {
      throw StateError('写队列已满（$maxDepth）');
    }
    final generation = _generations[deviceId] ?? 0;
    final previous = _tails[deviceId] ?? Future<void>.value();
    final done = Completer<void>();
    _tails[deviceId] = done.future;
    _depths[deviceId] = depth(deviceId) + 1;
    try {
      await previous;
      if ((_generations[deviceId] ?? 0) != generation) {
        throw StateError('连接已结束，写入已取消');
      }
      final value = await action();
      if ((_generations[deviceId] ?? 0) != generation) {
        throw StateError('连接已结束，旧写入回执已丢弃');
      }
      return value;
    } finally {
      _depths[deviceId] = depth(deviceId) - 1;
      done.complete();
      if (identical(_tails[deviceId], done.future)) {
        _tails.remove(deviceId);
        _depths.remove(deviceId);
      }
    }
  }

  void cancel(String deviceId) {
    _generations[deviceId] = (_generations[deviceId] ?? 0) + 1;
  }
}
