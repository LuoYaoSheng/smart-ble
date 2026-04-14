#ifndef __SMART_BLE_OTA_DEFINITIONS_H__
#define __SMART_BLE_OTA_DEFINITIONS_H__

/**
 * @file ota_definitions.h
 * @brief Smart BLE OTA Protocol Architecture Reference (Cross-Platform SSOT)
 *
 * This file strictly aligns the Embedded C code with the UI Clients.
 * Flutter/UniApp/Tauri clients will send data according to these specs.
 */

#include <stdint.h>

// 1. Service & Characteristic UUIDs
#define OTA_SERVICE_UUID     "4fafc201-1fb5-459e-8fcc-c5c9c331914d"
#define OTA_CHAR_CONTROL     "beb5483e-36e1-4688-b7f5-ea07361b26c0"  // Write (With Response)
#define OTA_CHAR_DATA        "beb5483e-36e1-4688-b7f5-ea07361b26c1"  // Write Without Response
#define OTA_CHAR_STATUS      "beb5483e-36e1-4688-b7f5-ea07361b26c2"  // Notify

// 2. MTU & Chunking Constraints
#define OTA_PREFERRED_MTU    247
#define OTA_MAX_CHUNK_SIZE   180  // Enforced by Mobile OS lowest common denominators

// 3. Finite State Machine Keys
typedef enum {
    OTA_STATE_IDLE = 0,
    OTA_STATE_MAPPING,      // Awaiting start command
    OTA_STATE_IN_PROGRESS,  // Receiving 180-Byte chunks
    OTA_STATE_VERIFYING,    // Checking MD5/Signatures
    OTA_STATE_REBOOT,       // Flashing & Restart
    OTA_STATE_ABORT         // Error handling
} ota_fsm_state_t;

// 4. JSON RPC Actions (Control Channel Payload)
// START Command:  {"action":"start", "size":124500, "chunk_size":180, "firmware_version":"flutter-bin"}
// COMMIT Command: {"action":"commit"}
// ABORT Command:  {"action":"abort"}

#define OTA_JSON_CMD_START   "start"
#define OTA_JSON_CMD_COMMIT  "commit"
#define OTA_JSON_CMD_ABORT   "abort"

// 5. Notify Status Formats (Status Channel Payload)
// Format strictly required to be JSON:
// {"type":"ota", "status":"success", "message":"Ready to reboot"}
// {"type":"ota", "status":"error", "message":"Out of memory"}

#endif /* __SMART_BLE_OTA_DEFINITIONS_H__ */
