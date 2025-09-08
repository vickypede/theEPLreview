import SwiftUI

struct NewsListView: View {
    @State private var items: [Article] = []
    @State private var safariURL: URL?

    var body: some View {
        List(items) { a in
            Button {
                if let u = URL(string: a.url) { safariURL = u }
            } label: {
                VStack(alignment: .leading) {
                    Text(a.title).font(.headline)
                    if let ts = a.publishedAt?.dateValue() {
                        Text(ts.formatted()).font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
        }
        .sheet(item: $safariURL) { url in SafariView(url: url) }
        .onAppear { FirestoreService.shared.latestArticles { items = $0 } }
        .navigationTitle("News")
    }
}
