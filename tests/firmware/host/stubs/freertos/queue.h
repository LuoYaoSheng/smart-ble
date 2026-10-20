#pragma once
#include <deque>
#include <vector>
#include <mutex>
#include <cstring>
struct FakeQueue { size_t capacity; size_t size; std::mutex mutex; std::deque<std::vector<uint8_t>> events; };
using QueueHandle_t = FakeQueue*;
inline QueueHandle_t xQueueCreate(size_t capacity, size_t size) { return new FakeQueue{capacity, size, {}, {}}; }
inline int xQueueSend(QueueHandle_t q, const void* item, int) {
    std::lock_guard<std::mutex> lock(q->mutex);
    if (q->events.size() >= q->capacity) return 0;
    auto bytes = static_cast<const uint8_t*>(item);
    q->events.emplace_back(bytes, bytes + q->size); return 1;
}
inline int xQueueReceive(QueueHandle_t q, void* item, int) {
    std::lock_guard<std::mutex> lock(q->mutex);
    if (q->events.empty()) return 0;
    memcpy(item, q->events.front().data(), q->size); q->events.pop_front(); return 1;
}
inline void xQueueReset(QueueHandle_t q) { std::lock_guard<std::mutex> lock(q->mutex); q->events.clear(); }
inline void vQueueDelete(QueueHandle_t q) { delete q; }

inline size_t uxQueueMessagesWaiting(QueueHandle_t q) { std::lock_guard<std::mutex> lock(q->mutex); return q->events.size(); }
