//go:build !windows

package main

import "fmt"

func (a *App) ensureWinBridge() (*winBridge, error) {
	return nil, fmt.Errorf("broadcast sidecar requires windows")
}

func (a *App) killWinBridge() {}
