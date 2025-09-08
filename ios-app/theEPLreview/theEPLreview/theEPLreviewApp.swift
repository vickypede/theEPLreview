//
//  theEPLreviewApp.swift
//  theEPLreview
//
//  Created by Victor Onipede on 2025-09-07.
//

import SwiftUI
import Firebase

@main
struct theEPLreviewApp: App {
    // Register the AppDelegate for Firebase setup
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
