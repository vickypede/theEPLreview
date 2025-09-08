import Foundation
import FirebaseFirestore
import FirebaseFirestoreSwift

struct Article: Identifiable, Codable {
    @DocumentID var id: String?
    let title: String
    let url: String
    let source: String?
    let publishedAt: Timestamp?
    let clubs: [String]
}

final class FirestoreService {
    static let shared = FirestoreService()
    private let db = Firestore.firestore()

    func latestArticles(limit: Int = 30, completion: @escaping ([Article]) -> Void) {
        db.collection("articles")
            .order(by: "publishedAt", descending: true)
            .limit(to: limit)
            .addSnapshotListener { snap, _ in
                let items = snap?.documents.compactMap { try? $0.data(as: Article.self) } ?? []
                completion(items)
            }
    }

    func clubArticles(_ slug: String, limit: Int = 30, completion: @escaping ([Article]) -> Void) {
        db.collection("articles")
            .whereField("clubs", arrayContains: slug)
            .order(by: "publishedAt", descending: true)
            .limit(to: limit)
            .addSnapshotListener { snap, _ in
                let items = snap?.documents.compactMap { try? $0.data(as: Article.self) } ?? []
                completion(items)
            }
    }
}
