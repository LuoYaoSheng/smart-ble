package main

import (
	"strings"
	"testing"
)

func TestNoAdapterBlocksInitScanAndAdvertising(t *testing.T) {
	a := &App{availabilityProbe: func() bluetoothAvailability { return bluetoothAvailability{State: "noAdapter"} }}
	init := a.Init()
	if init.Success || init.State != "noAdapter" || !strings.HasPrefix(init.Error, "NO_ADAPTER:") {
		t.Fatalf("bad init: %+v", init)
	}
	for _, result := range []plainResult{a.StartScan(), a.StartAdvertising("", nil, "", "", false)} {
		if result.Success || !strings.Contains(result.Error, "NO_ADAPTER:") {
			t.Fatalf("bad result: %+v", result)
		}
	}
	if a.adapter != nil || a.wbridge != nil {
		t.Fatal("no hardware must not initialize adapter or broadcast sidecar")
	}
}
