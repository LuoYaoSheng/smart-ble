package main

import (
	"testing"
)

func TestBluetoothAvailabilityParser(t *testing.T) {
	for _, state := range []string{"poweredOn", "poweredOff", "noAdapter", "unsupportedAdapter", "unauthorized", "unavailable"} {
		value := parseBluetoothAvailability([]byte(`{"state":"` + state + `"}`))
		if value.State != state {
			t.Fatalf("%s -> %s", state, value.State)
		}
		if (value.requireReady() == nil) != (state == "poweredOn") {
			t.Fatalf("unsafe ready result: %s", state)
		}
	}
	for _, raw := range []string{"", `{}`, `{"state":"ready"}`} {
		if parseBluetoothAvailability([]byte(raw)).State != "unavailable" {
			t.Fatal("query must fail closed")
		}
	}
}
