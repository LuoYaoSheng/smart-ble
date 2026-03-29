package com.smartble.ui.screen

fun formatBytes(bytes: Long): String {
    if (bytes <= 0L) return "0 B"
    if (bytes < 1024L) return "$bytes B"
    if (bytes < 1024L * 1024L) return String.format("%.1f KB", bytes / 1024f)
    return String.format("%.1f MB", bytes / (1024f * 1024f))
}

fun isValidHexInput(value: String): Boolean {
    val clean = value.replace(" ", "")
    if (clean.isEmpty() || clean.length % 2 != 0) {
        return false
    }
    return clean.all { it.isDigit() || it.lowercaseChar() in 'a'..'f' }
}
