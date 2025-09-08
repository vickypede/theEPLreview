//
//  ContentView.swift
//  theEPLreview
//
//  Created by Victor Onipede on 2025-09-07.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            Text("Home Coming Soon")
                .tabItem { Label("Home", systemImage: "house") }

            NavigationStack { NewsListView() }
                .tabItem { Label("News", systemImage: "newspaper") }

            Text("Clubs Coming Soon")
                .tabItem { Label("Clubs", systemImage: "sportscourt") }
        }
    }
}
