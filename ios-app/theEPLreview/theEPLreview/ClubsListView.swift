import SwiftUI

struct ClubsListView: View {
    @State private var clubs: [Club] = []
    @State private var loading = true

    var body: some View {
        Group {
            if loading {
                ProgressView("Loading clubs…")
            } else if clubs.isEmpty {
                Text("No clubs available")
                    .foregroundStyle(.secondary)
            } else {
                List(clubs) { club in
                    NavigationLink(destination: ClubArticlesList(club: club)) {
                        HStack {
                            if let urlString = club.crestURL, let url = URL(string: urlString) {
                                AsyncImage(url: url) { image in
                                    image.resizable()
                                } placeholder: {
                                    Color.gray.opacity(0.2)
                                }
                                .frame(width: 32, height: 32)
                                .clipShape(Circle())
                            }
                            Text(club.name)
                        }
                    }
                }
            }
        }
        .navigationTitle("Clubs")
        .task {
            FirestoreService.shared.allClubs { arr in
                clubs = arr
                loading = false
            }
        }
    }
}
