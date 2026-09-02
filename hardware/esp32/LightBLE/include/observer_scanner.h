#pragma once

void observerScannerBegin();
void observerScannerLoop();
void observerScannerStop();
bool observerScannerIsRunning();

// Basic fault injection entry (scan timeout / scan error)
void observerFaultSetScanTimeout(bool enabled);
void observerFaultSetScanError(bool enabled);
