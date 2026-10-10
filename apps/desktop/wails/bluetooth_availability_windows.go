//go:build windows

package main

import (
	"context"
	_ "embed"
	"encoding/base64"
	"encoding/binary"
	"os/exec"
	"syscall"
	"time"
	"unicode/utf16"
)

//go:embed windows-bluetooth-availability.ps1
var bluetoothAvailabilityScript string

func readBluetoothAvailability() bluetoothAvailability {
	words := utf16.Encode([]rune(bluetoothAvailabilityScript))
	bytes := make([]byte, len(words)*2)
	for index, word := range words {
		binary.LittleEndian.PutUint16(bytes[index*2:], word)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	command := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", base64.StdEncoding.EncodeToString(bytes))
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	output, error := command.Output()
	if error != nil {
		return bluetoothAvailability{State: "unavailable"}
	}
	return parseBluetoothAvailability(output)
}
