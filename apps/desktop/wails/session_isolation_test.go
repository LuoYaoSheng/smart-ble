package main

import "testing"

func TestUnknownDeviceNeverFallsBackToAnotherConnection(t *testing.T) {
	a := &App{conns: map[string]*gattConn{"A": {id: "A"}}}
	if a.getConn("B") != nil {
		t.Fatal("unknown device B resolved to device A")
	}
	if a.getConn("A") != a.conns["A"] {
		t.Fatal("known device was not resolved")
	}
	if a.getConn("") != a.conns["A"] {
		t.Fatal("single-session legacy lookup failed")
	}
	a.conns["B"] = &gattConn{id: "B"}
	if a.getConn("") != nil {
		t.Fatal("ambiguous legacy lookup selected arbitrary device")
	}
}

func TestCharacteristicKeysIncludeOwningService(t *testing.T) {
	if gattKey("180a", "2a19") == gattKey("180f", "2a19") {
		t.Fatal("same characteristic UUID in different services collided")
	}
	if gattKey("180a", "2a19") != gattKey("0000180A-0000-1000-8000-00805F9B34FB", "00002A19-0000-1000-8000-00805F9B34FB") {
		t.Fatal("equivalent UUID spellings did not normalize")
	}
}

func TestDisconnectCancelsPendingConnectionGeneration(t *testing.T) {
	a := &App{conns: map[string]*gattConn{}, connectEpoch: map[string]uint64{"A": 1}}
	epoch := a.connectEpoch["A"]
	if !a.Disconnect("A").Success {
		t.Fatal("disconnect of pending connection failed")
	}
	if a.connectEpoch["A"] == epoch {
		t.Fatal("late connection would still be accepted")
	}
}
