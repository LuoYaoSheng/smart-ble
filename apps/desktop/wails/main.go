package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp(assets)

	// Create application with options
	err := wails.Run(&options.App{
		// 壳家族口径：E/V/F/Q 同为 1200x900，标题 SmartBLE
		Title:     "SmartBLE",
		Width:     1200,
		Height:    900,
		MinWidth:  900,
		MinHeight: 600,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 242, G: 242, B: 247, A: 1},
		OnStartup:        app.startup,
		// 退出确认（10_platform §4）：未确认时拦截 X/Alt+F4，渲染层弹正典模态
		OnBeforeClose: app.beforeClose,
		OnShutdown:    app.onShutdown,
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
		},
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
