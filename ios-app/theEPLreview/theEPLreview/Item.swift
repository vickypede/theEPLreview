//
//  Item.swift
//  theEPLreview
//
//  Created by Victor Onipede on 2025-09-07.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
