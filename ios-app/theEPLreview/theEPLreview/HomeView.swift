import SwiftUI

struct HomeView: View {
    @State private var pubs: [Publication] = []
    @State private var news: [Article] = []
    @State private var safariURL: URL?
    @State private var selectedPub: Publication?

    var body: some View {
        NavigationStack {
            List {
                Section("Latest Publications") {
                    ForEach(pubs) { p in
                        Button { selectedPub = p } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(p.title).font(.headline)
                                if let ts = p.publishedAt?.dateValue() {
                                    Text(ts.formatted()).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                Section("Latest News") {
                    ForEach(news) { a in
                        Button {
                            if let u = URL(string: a.url) { safariURL = u }
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(a.title).font(.body)
                                if let ts = a.publishedAt?.dateValue() {
                                    Text(ts.formatted()).font(.caption2).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                Section("EPL Table") {
                    Text("Table coming soon…")
                }
            }
            .navigationDestination(item: $selectedPub) { p in
                PublicationDetailView(pub: p)
            }
            .sheet(item: $safariURL) { url in SafariView(url: url) }
            .task {
                FirestoreService.shared.latestPublications { pubs = $0 }
                FirestoreService.shared.latestArticles(limit: 20) { news = $0 }
            }
            .navigationTitle("Home")
        }
    }
}
