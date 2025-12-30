//
//  SmartBLEApp.swift
//  SmartBLE
//
//  主应用入口
//

import SwiftUI

@main
struct SmartBLEApp: App {
    var body: some Scene {
        WindowGroup {
            DeviceListView()
        }
    }
}
