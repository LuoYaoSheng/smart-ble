package main

import (
	"encoding/json"
	"errors"
)

type bluetoothAvailability struct {
	State string `json:"state"`
}

func parseBluetoothAvailability(data []byte) bluetoothAvailability {
	value := bluetoothAvailability{State: "unavailable"}
	if json.Unmarshal(data, &value) != nil {
		return bluetoothAvailability{State: "unavailable"}
	}
	switch value.State {
	case "poweredOn", "poweredOff", "noAdapter", "unsupportedAdapter", "unauthorized", "unavailable":
		return value
	default:
		return bluetoothAvailability{State: "unavailable"}
	}
}
func (value bluetoothAvailability) requireReady() error {
	if value.State == "poweredOn" {
		return nil
	}
	messages := map[string]string{
		"noAdapter":          "NO_ADAPTER: No Bluetooth adapter was found",
		"poweredOff":         "BLUETOOTH_OFF: Bluetooth is turned off",
		"unsupportedAdapter": "UNSUPPORTED_ADAPTER: The adapter does not support BLE",
		"unauthorized":       "BLUETOOTH_UNAUTHORIZED: Bluetooth access is denied",
		"unsupported":        "UNSUPPORTED_PLATFORM: Bluetooth is unsupported on this platform",
	}
	if message, ok := messages[value.State]; ok {
		return errors.New(message)
	}
	return errors.New("BLUETOOTH_UNAVAILABLE: Bluetooth availability could not be confirmed")
}
