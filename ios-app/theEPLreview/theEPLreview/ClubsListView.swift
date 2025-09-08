import SwiftUI

struct ClubsListView: View {
    @State private var clubs: [Club] = []

    var body: some View {
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
        .onAppear { FirestoreService.shared.allClubs { clubs = $0 } }
        .navigationTitle("Clubs")
    }
}
