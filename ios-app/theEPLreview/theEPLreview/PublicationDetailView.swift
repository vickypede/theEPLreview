import SwiftUI
import MarkdownUI
import SDWebImageSwiftUI

struct PublicationDetailView: View {
    let pub: Publication

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let img = pub.featuredImage, let url = URL(string: img) {
                    WebImage(url: url)
                        .resizable()
                        .scaledToFill()
                        .frame(maxWidth: .infinity, maxHeight: 200)
                        .clipped()
                }
                Text(pub.title)
                    .font(.title)
                    .bold()
                Markdown(pub.content)
                    .markdownTheme(.document)
            }
            .padding()
        }
        .navigationTitle(pub.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
