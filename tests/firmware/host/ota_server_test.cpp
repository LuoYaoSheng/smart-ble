// Runs the production ota_server.cpp, with only hardware libraries replaced.
#include "ota_server.h"
#include "fixture_config.h"
#include "Update.h"
#include "esp_app_format.h"
#include <openssl/sha.h>
#include <cassert>
#include <iostream>
#include <thread>
#include <fstream>
#include <iterator>

static std::string digest(const std::string& bytes) {
    unsigned char hash[32]; SHA256(reinterpret_cast<const unsigned char*>(bytes.data()), bytes.size(), hash);
    char out[65]; for (unsigned i = 0; i < 32; ++i) snprintf(out + i * 2, 3, "%02x", hash[i]);
    return out;
}
static std::string image(size_t length = 1024, const char* version = "1.0.1", bool otherChip = false, const char* target = OTA_TARGET_PERIPHERAL) {
    std::string bytes(length, '\x42');
    esp_image_header_t head{}; head.magic = 0xE9;
    head.chip_id = CONFIG_IDF_TARGET_ESP32S3 ? 9 : 0;
    if (otherChip) head.chip_id = head.chip_id == 9 ? 0 : 9;
    esp_app_desc_t app{}; app.magic_word = ESP_APP_DESC_MAGIC_WORD; strncpy(app.version, version, sizeof(app.version) - 1);
    strncpy(app.project_name, target, sizeof(app.project_name) - 1);
    memcpy(&bytes[0], &head, sizeof(head)); memcpy(&bytes[32], &app, sizeof(app));
    return bytes;
}
struct Fixture {
    NimBLECharacteristic ctrl, data, status;
    OtaServer ota;
    Fixture() { Update = FakeUpdate{}; fakeMillis = 1; ESP.restarted = false; ota.begin(&ctrl, &data, &status); }
    ~Fixture() { ctrl.write("{\"op\":\"abort\"}"); ota.loop(); }
    void control(const std::string& value) { ctrl.write(value); }
    std::string startJson(const std::string& bytes, const std::string& hash = "", const char* hardware = DEVICE_HARDWARE, const char* target = OTA_TARGET_PERIPHERAL) {
        return "{\"op\":\"start\",\"target\":\"" + std::string(target) + "\",\"hardware\":\"" + hardware + "\",\"size\":" + std::to_string(bytes.size()) + ",\"chunk_size\":512,\"target_version\":\"1.0.1\",\"sha256\":\"" + (hash.empty() ? digest(bytes) : hash) + "\"}";
    }
    void start(const std::string& bytes, const std::string& hash = "") { control(startJson(bytes, hash)); ota.loop(); assert(ota.state() == OTA_RECEIVING); }
    void send(const std::string& bytes) { for (size_t i = 0; i < bytes.size(); i += 512) data.write(bytes.substr(i, 512)); }
    void commit() { control("{\"op\":\"commit\"}"); ota.loop(); }
    bool detail(const char* text) { for (auto& event : status.notifications) if (event.find(text) != std::string::npos) return true; return false; }
};
static unsigned cases = 0;
#define CASE(name, ...) do { __VA_ARGS__; ++cases; std::cout << "PASS " << name << '\n'; } while (0)
int main(int argc, char** argv) {
    CASE("complete staged commit drains before hash and boot selection", {
        Fixture f; auto bytes = image(); f.start(bytes); f.send(bytes); f.commit();
        assert(f.ota.state() == OTA_SUCCESS); assert(Update.bootSelected); assert(Update.bytes == std::vector<uint8_t>(bytes.begin(), bytes.end()));
        assert(f.detail("success")); assert(f.ota.activeFirmwareVersion() == "1.0.0");
        f.ctrl.callbacks->onRead(&f.ctrl);
        assert(f.ctrl.getValue().find("\"status\":\"success\"") != std::string::npos);
        fakeMillis += 1501; f.ota.loop(); assert(ESP.restarted);
    });
    CASE("wrong expected hash never selects boot partition", {
        Fixture f; auto bytes = image(); f.start(bytes, std::string(64, 'a')); f.send(bytes); f.commit();
        assert(f.ota.state() == OTA_FAILED); assert(f.detail("OTA_HASH_MISMATCH")); assert(!Update.bootSelected);
    });
    CASE("fault hash with invalid length is rejected", {
        Fixture f; auto bytes = image(); f.start(bytes); f.ota.faults().wrongHash = true; f.send(bytes); f.commit();
        assert(f.detail("OTA_HASH_MISMATCH")); assert(!Update.bootSelected);
    });
    CASE("missing hash rejected before Update.begin", {
        Fixture f; auto json = f.startJson(image()); json.erase(json.find(",\"sha256\"")); json += "}"; f.control(json); f.ota.loop();
        assert(f.ota.state() == OTA_FAILED); assert(Update.beginCount == 0);
    });
    CASE("hardware and observer target rejected", {
        Fixture f; f.control(f.startJson(image(), "", "other-board")); f.ota.loop(); assert(f.detail("hardware_mismatch"));
        f.control(f.startJson(image(), "", DEVICE_HARDWARE, OTA_TARGET_OBSERVER)); f.ota.loop(); assert(f.detail("invalid_target")); assert(Update.beginCount == 0);
    });
    CASE("negative and fractional numeric fields are rejected", {
        Fixture f; auto json = f.startJson(image()); auto at = json.find("1024");
        json.replace(at, 4, "-1"); f.control(json); f.ota.loop(); assert(Update.beginCount == 0);
        json = f.startJson(image()); json.replace(json.find("1024"), 4, "10.5");
        f.control(json); f.ota.loop(); assert(Update.beginCount == 0);
    });
    CASE("pre-ready data is not accepted", {
        Fixture f; auto bytes = image(); f.control(f.startJson(bytes)); f.data.write(bytes.substr(0, 512)); f.ota.loop();
        assert(f.detail("ota_not_started")); assert(Update.bytes.empty());
    });
    CASE("abort before queued begin cancels begin", {
        Fixture f; f.control(f.startJson(image())); f.control("{\"op\":\"abort\"}"); f.ota.loop();
        assert(f.ota.state() == OTA_ABORTED); assert(Update.beginCount == 0); assert(!Update.active);
    });
    CASE("abort cancels queued commit before selecting boot partition", {
        Fixture f; auto bytes = image(); f.start(bytes); f.send(bytes);
        f.control("{\"op\":\"commit\"}"); f.control("{\"op\":\"abort\"}"); f.ota.loop();
        assert(f.ota.state() == OTA_ABORTED); assert(Update.endCount == 0); assert(!Update.bootSelected);
    });
    CASE("new start cancels pending commit and its staged image", {
        Fixture f; auto bytes = image(), next = image(1536); f.start(bytes); f.send(bytes);
        f.control("{\"op\":\"commit\"}"); f.control(f.startJson(next)); f.ota.loop();
        assert(Update.endCount == 0); assert(Update.bytes.empty()); assert(Update.expected == next.size());
        f.send(next); f.commit(); assert(Update.bootSelected);
    });
    CASE("new start discards pending state and old hash", {
        Fixture f; auto first = image(1024), second = image(1536); f.control(f.startJson(first)); f.control(f.startJson(second)); f.ota.loop();
        assert(Update.beginCount == 1); assert(Update.expected == second.size()); f.send(second); f.commit(); assert(Update.bootSelected);
    });
    CASE("disconnect cancels pending begin", {
        Fixture f; f.control(f.startJson(image())); f.ota.onDisconnect(); f.ota.loop(); assert(Update.beginCount == 0); assert(!Update.bootSelected);
    });
    CASE("disconnect while receiving aborts without commit", {
        Fixture f; auto bytes = image(); f.start(bytes); f.send(bytes); f.ota.onDisconnect(); f.ota.loop();
        assert(f.ota.state() == OTA_FAILED); assert(f.detail("disconnect")); assert(!Update.active); assert(!Update.bootSelected);
    });
    CASE("idle timeout aborts and later start succeeds", {
        Fixture f; auto bytes = image(); f.start(bytes); fakeMillis += 30001; f.ota.loop(); assert(f.detail("timeout")); assert(!Update.active);
        f.start(bytes); f.send(bytes); f.commit(); assert(Update.bootSelected);
    });
    CASE("oversized negotiated chunk aborts", {
        Fixture f; auto bytes = image(); f.start(bytes); f.data.write(bytes.substr(0, 513)); f.ota.loop(); assert(f.ota.state() == OTA_FAILED); assert(!Update.bootSelected);
    });
    CASE("declared byte length overflow aborts", {
        Fixture f; auto bytes = image(); f.start(bytes); f.send(bytes); f.data.write("x"); f.ota.loop(); assert(f.ota.state() == OTA_FAILED); assert(!Update.bootSelected);
    });
    CASE("partial commit cannot end image", {
        Fixture f; auto bytes = image(); f.start(bytes); f.data.write(bytes.substr(0, 512)); f.commit(); assert(f.detail("OTA_SIZE_MISMATCH")); assert(Update.endCount == 0);
    });
    CASE("image chip mismatch rejected before flash write", {
        Fixture f; auto bytes = image(1024, "1.0.1", true); f.start(bytes); f.send(bytes); f.commit(); assert(f.detail("image_target_or_version_mismatch")); assert(Update.bytes.empty()); assert(!Update.bootSelected);
    });
    CASE("observer image cannot be forged as peripheral by a renamed manifest", {
        Fixture f; auto bytes = image(1024, "1.0.1", false, OTA_TARGET_OBSERVER);
        f.start(bytes); f.send(bytes); f.commit(); assert(f.detail("image_target_or_version_mismatch"));
        assert(Update.bytes.empty()); assert(!Update.bootSelected);
    });
    CASE("image actual version mismatch cannot be forged by start", {
        Fixture f; auto bytes = image(1024, "2.0.0"); f.start(bytes); f.send(bytes); f.commit(); assert(f.detail("image_target_or_version_mismatch")); assert(!Update.bootSelected);
    });
    CASE("begin failure leaves no pending flash work", {
        Fixture f; Update.beginFails = true; f.control(f.startJson(image())); f.ota.loop(); assert(f.detail("update_begin_failed")); assert(!Update.active);
    });
    CASE("write failure aborts session", {
        Fixture f; auto bytes = image(); f.start(bytes); Update.writeFails = true; f.send(bytes); f.commit(); assert(f.detail("chunk_write_failed")); assert(!Update.bootSelected);
    });
    CASE("image end failure is not reported as success", {
        Fixture f; auto bytes = image(); f.start(bytes); Update.endFails = true; f.send(bytes); f.commit(); assert(f.detail("update_end_failed")); assert(!Update.bootSelected);
    });
    CASE("bounded input FIFO fails closed on overflow", {
        Fixture f; auto bytes = image(); f.start(bytes); for (int i = 0; i < 17; ++i) f.data.write("x"); f.ota.loop();
        assert(f.detail("input_queue_overflow")); assert(f.ota.state() == OTA_FAILED); assert(!Update.bootSelected);
    });
    CASE("BLE callback producer and loop consumer use real synchronized queue", {
        Fixture f; auto bytes = image(64 * 1024); f.start(bytes);
        // One packet is acknowledged by loop before producer queues the next.
        std::atomic<unsigned> produced{0}, consumed{0};
        std::thread producer([&] { for (unsigned i = 0; i < bytes.size() / 512; ++i) {
            while (consumed.load() != i) std::this_thread::yield();
            f.data.write(bytes.substr(i * 512, 512)); produced.store(i + 1);
        }});
        for (unsigned i = 0; i < bytes.size() / 512; ++i) {
            while (produced.load() != i + 1) std::this_thread::yield();
            f.ota.loop(); consumed.store(i + 1);
        }
        producer.join(); f.commit(); assert(Update.bootSelected); assert(Update.bytes.size() == bytes.size());
    });
    if (argc >= 2) {
        std::ifstream file(argv[1], std::ios::binary);
        assert(file.good());
        std::string bytes((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
        Fixture f; f.start(bytes);
        for (size_t offset = 0; offset < bytes.size(); offset += 512) {
            f.data.write(bytes.substr(offset, 512)); f.ota.loop();
        }
        f.commit(); assert(Update.bootSelected); assert(Update.bytes.size() == bytes.size());
        ++cases; std::cout << "PASS complete built application image: " << argv[1] << " bytes=" << bytes.size() << '\n';
    }
    if (argc == 3) {
        std::ifstream file(argv[2], std::ios::binary); assert(file.good());
        std::string bytes((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
        assert(bytes.size() >= 288); assert(std::string(bytes.c_str() + 80) == OTA_TARGET_OBSERVER);
        std::string version(bytes.c_str() + 48);
        Fixture f; auto control = f.startJson(bytes);
        auto at = control.find("1.0.1"); assert(at != std::string::npos); control.replace(at, 5, version);
        f.control(control); f.ota.loop(); assert(f.ota.state() == OTA_RECEIVING);
        f.data.write(bytes.substr(0, 512)); f.ota.loop();
        assert(f.detail("image_target_or_version_mismatch")); assert(Update.bytes.empty()); assert(!Update.bootSelected);
        ++cases; std::cout << "PASS real observer image rejected despite matching SHA/version/chip: " << argv[2] << '\n';
    }
    std::cout << "Production firmware state-machine tests: " << cases << " passed; chip=" << (CONFIG_IDF_TARGET_ESP32S3 ? "ESP32-S3" : "ESP32") << '\n';
}
