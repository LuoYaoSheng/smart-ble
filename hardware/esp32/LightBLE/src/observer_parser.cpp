#include "observer_parser.h"

#include "fixture_config.h"

static String normalizeUuid(const String& input) {
    String out;
    out.reserve(input.length());
    for (size_t i = 0; i < input.length(); i++) {
        char c = input.charAt(i);
        if (c == '-') continue;
        if (c >= 'A' && c <= 'F') c = c - 'A' + 'a';
        out += c;
    }
    return out;
}

String bytesToHex(const uint8_t* data, size_t len) {
    static const char* hex = "0123456789abcdef";
    String out;
    out.reserve(len * 2);
    for (size_t i = 0; i < len; i++) {
        out += hex[(data[i] >> 4) & 0x0F];
        out += hex[data[i] & 0x0F];
    }
    return out;
}

static String uuid16ToString(uint16_t uuid) {
    char buf[5];
    snprintf(buf, sizeof(buf), "%04x", uuid);
    return String(buf);
}

static String uuid128ToString(const uint8_t* bytes) {
    // BLE AD 128-bit UUID is little-endian
    char buf[37];
    snprintf(
        buf,
        sizeof(buf),
        "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
        bytes[15], bytes[14], bytes[13], bytes[12],
        bytes[11], bytes[10],
        bytes[9], bytes[8],
        bytes[7], bytes[6],
        bytes[5], bytes[4], bytes[3], bytes[2], bytes[1], bytes[0]
    );
    return String(buf);
}

ParsedAdvertisement parseAdvertisementPayload(const uint8_t* data, size_t len) {
    ParsedAdvertisement parsed;
    parsed.rawHex = bytesToHex(data, len);

    size_t i = 0;
    while (i < len) {
        uint8_t fieldLen = data[i];
        if (fieldLen == 0) break;
        if (i + 1 + fieldLen > len) break;
        uint8_t type = data[i + 1];
        const uint8_t* payload = &data[i + 2];
        size_t payloadLen = fieldLen - 1;

        switch (type) {
            case 0x08: { // Short Local Name
                parsed.hasShortName = true;
                if (parsed.name.isEmpty()) {
                    parsed.name = String(reinterpret_cast<const char*>(payload), payloadLen);
                }
                break;
            }
            case 0x09: { // Complete Local Name
                parsed.hasCompleteName = true;
                parsed.name = String(reinterpret_cast<const char*>(payload), payloadLen);
                break;
            }
            case 0x02: // Incomplete 16-bit UUIDs
            case 0x03: { // Complete 16-bit UUIDs
                for (size_t j = 0; j + 1 < payloadLen; j += 2) {
                    uint16_t uuid = payload[j] | (static_cast<uint16_t>(payload[j + 1]) << 8);
                    parsed.services.push_back(uuid16ToString(uuid));
                }
                break;
            }
            case 0x06: // Incomplete 128-bit UUIDs
            case 0x07: { // Complete 128-bit UUIDs
                for (size_t j = 0; j + 15 < payloadLen; j += 16) {
                    parsed.services.push_back(uuid128ToString(&payload[j]));
                }
                break;
            }
            case 0x16: { // Service Data - 16-bit UUID
                if (payloadLen >= 2) {
                    parsed.serviceDataHex = bytesToHex(payload, payloadLen);
                }
                break;
            }
            case 0xFF: { // Manufacturer Specific Data
                parsed.manufacturerHex = bytesToHex(payload, payloadLen);
                break;
            }
            default:
                break;
        }

        i += 1 + fieldLen;
    }

    return parsed;
}

bool matchesPeripheralName(const String& name) {
    return name == DEVICE_NAME || name.indexOf(DEVICE_NAME) >= 0;
}

bool matchesOtaService(const std::vector<String>& services) {
    String target = normalizeUuid(String(SERVICE_UUID_OTA));
    for (const auto& svc : services) {
        if (normalizeUuid(svc) == target) return true;
    }
    return false;
}

bool matchesMainService(const std::vector<String>& services) {
    String target = normalizeUuid(String(SERVICE_UUID));
    for (const auto& svc : services) {
        if (normalizeUuid(svc) == target) return true;
    }
    return false;
}

bool computeFixtureMatch(const ParsedAdvertisement& parsed) {
    return matchesPeripheralName(parsed.name) || matchesMainService(parsed.services);
}
