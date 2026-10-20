#pragma once
#include <openssl/sha.h>
using mbedtls_sha256_context = SHA256_CTX;
inline void mbedtls_sha256_init(mbedtls_sha256_context*) {}
inline int mbedtls_sha256_starts_ret(mbedtls_sha256_context* c, int) { return SHA256_Init(c) == 1 ? 0 : -1; }
inline int mbedtls_sha256_update_ret(mbedtls_sha256_context* c, const unsigned char* data, size_t count) { return SHA256_Update(c, data, count) == 1 ? 0 : -1; }
inline int mbedtls_sha256_finish_ret(mbedtls_sha256_context* c, unsigned char* out) { return SHA256_Final(out, c) == 1 ? 0 : -1; }
inline void mbedtls_sha256_free(mbedtls_sha256_context*) {}
