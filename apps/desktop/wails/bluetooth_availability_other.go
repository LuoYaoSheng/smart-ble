//go:build !windows

package main

func readBluetoothAvailability() bluetoothAvailability {
	return bluetoothAvailability{State: "unsupported"}
}
