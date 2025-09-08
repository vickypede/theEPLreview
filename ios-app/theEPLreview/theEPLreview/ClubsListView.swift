import SwiftUI

struct ClubsListView: View {
    @State private var clubs: [Club] = []

    var body: some View {
        if clubs.isEmpty {
            ProgressView("Loading clubs…")
                .task { FirestoreService.shared.allClubs { clubs = $0 } }
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
        .navigationTitle("Clubs")
    }
}
