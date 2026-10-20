#pragma once
#include <cstdint>
#define ESP_APP_DESC_MAGIC_WORD 0xABCD5432
struct __attribute__((packed)) esp_image_header_t { uint8_t magic; uint8_t rest[11]; uint16_t chip_id; uint8_t tail[10]; };
struct esp_image_segment_header_t { uint32_t load_addr, data_len; };
struct esp_app_desc_t { uint32_t magic_word, secure_version, reserved[2]; char version[32]; char project_name[32]; char rest[176]; };
static_assert(sizeof(esp_app_desc_t) == 256);
static_assert(sizeof(esp_image_header_t) == 24);
