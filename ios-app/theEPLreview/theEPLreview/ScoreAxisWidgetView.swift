import SwiftUI
import WebKit

struct ScoreAxisWidgetView: UIViewRepresentable {
    let clubSlug: String   // e.g. "aston-villa"

    // Same mapping as web TeamPanel
    private static let scoreAxisIDs: [String: Int] = [
        "arsenal": 19,
        "manchester-city": 9,
        "liverpool": 8,
        "chelsea": 18,
        "manchester-united": 14,
        "tottenham": 6,
        "newcastle": 20,
        "aston-villa": 15,
        "brighton": 78,
        "west-ham": 1,
        "brentford": 236,
        "fulham": 11,
        "crystal-palace": 51,
        "wolves": 29,
        "everton": 13,
        "nottingham-forest": 63,
        "burnley": 27,
        "luton-town": 115,
        "sheffield-united": 21,
        "bournemouth": 52,
        "leeds": 71
    ]

    func makeUIView(context: Context) -> WKWebView {
        let web = WKWebView()
        web.scrollView.isScrollEnabled = false
        web.isOpaque = false
        web.backgroundColor = .clear
        let html = widgetHTML(for: clubSlug)
        web.loadHTMLString(html, baseURL: nil)
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    private func widgetHTML(for slug: String) -> String {
        guard let teamID = Self.scoreAxisIDs[slug] else {
            return "<html><body style='font-family:-apple-system; font-size:14px; color:#888'>ScoreAxis ID not configured for \(slug)</body></html>"
        }

        let bodyBG = "#333333".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "#333333"
        let textColor = "#cccccc".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "#cccccc"
        let inst = "ios_\(teamID)"
        let src = "https://www.scoreaxis.com/widget/team-info/\(teamID)?autoHeight=1&bodyBackground=\(bodyBG)&textColor=\(textColor)&teamLogo=1&matchesTab=1&playersTab=1&statsTab=1&inst=\(inst)"

        return """
        <html><head><meta name='viewport' content='initial-scale=1.0, width=device-width'>
        <style>body{margin:0;background:#333333;}</style></head><body>
        <iframe src=\"\(src)\" style='width:100%; height:420px; border:0;' referrerpolicy='no-referrer-when-downgrade'></iframe>
        </body></html>
        """
    }
}
