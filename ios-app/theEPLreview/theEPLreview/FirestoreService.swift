import Foundation
import FirebaseFirestore

struct Article: Identifiable {
    let id: String
    let title: String
    let url: String
    let source: String?
    let publishedAt: Timestamp?
    let clubs: [String]

    init?(doc: DocumentSnapshot) {
        guard let data = doc.data(),
              let title = data["title"] as? String,
              let url = data["url"] as? String,
              let clubs = data["clubs"] as? [String] else { return nil }
        self.id = doc.documentID
        self.title = title
        self.url = url
        self.source = data["source"] as? String
        self.publishedAt = data["publishedAt"] as? Timestamp
        self.clubs = clubs
    }
}

struct Club: Identifiable {
    let id: String
    let name: String
    let slug: String
    let crestURL: String?

    init?(doc: DocumentSnapshot) {
        guard let data = doc.data(),
              let name = data["name"] as? String,
              let slug = data["slug"] as? String else { return nil }
        self.id = doc.documentID
        self.name = name
        self.slug = slug
        self.crestURL = data["crestURL"] as? String
    }
}

struct Publication: Identifiable {
    let id: String
    let title: String
    let excerpt: String?
    let content: String
    let slug: String?
    let publishedAt: Timestamp?
    let clubs: [String]
    let featuredImage: String?

    init?(doc: DocumentSnapshot) {
        guard let data = doc.data(),
              let title = data["title"] as? String,
              let content = data["content"] as? String else { return nil }
        self.id = doc.documentID
        self.title = title
        self.excerpt = data["excerpt"] as? String
        self.content = content
        self.slug = data["slug"] as? String
        self.publishedAt = data["publishedAt"] as? Timestamp
        self.clubs = data["clubs"] as? [String] ?? []
        self.featuredImage = data["featuredImage"] as? String
    }
}

final class FirestoreService {
    static let shared = FirestoreService()
    private let db = Firestore.firestore()

    func latestArticles(limit: Int = 30, completion: @escaping ([Article]) -> Void) {
        db.collection("articles")
            .order(by: "publishedAt", descending: true)
            .limit(to: limit)
            .addSnapshotListener { snap, _ in
                let items = snap?.documents.compactMap { Article(doc: $0) } ?? []
                completion(items)
            }
    }

    func clubArticles(_ slug: String, limit: Int = 30, completion: @escaping ([Article]) -> Void) {
        db.collection("articles")
            .whereField("clubs", arrayContains: slug)
            .order(by: "publishedAt", descending: true)
            .limit(to: limit)
            .addSnapshotListener { snap, _ in
                let items = snap?.documents.compactMap { Article(doc: $0) } ?? []
                completion(items)
            }
    }

    func allClubs(completion: @escaping ([Club]) -> Void) {
        db.collection("clubs")
            .order(by: "name")
            .addSnapshotListener { snap, _ in
                let items = snap?.documents.compactMap { Club(doc: $0) } ?? []
                completion(items)
            }
    }

    func latestPublications(limit: Int = 10, completion: @escaping ([Publication]) -> Void) {
        db.collection("publications")
            .whereField("status", isEqualTo: "published")
            .order(by: "publishedAt", descending: true)
            .limit(to: limit)
            .addSnapshotListener { snap, _ in
                let items = snap?.documents.compactMap { Publication(doc: $0) } ?? []
                completion(items)
            }
    }
}
