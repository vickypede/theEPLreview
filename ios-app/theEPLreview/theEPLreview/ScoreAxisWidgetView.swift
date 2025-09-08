import SwiftUI
import WebKit

struct ScoreAxisWidgetView: UIViewRepresentable {
    let clubSlug: String   // e.g. "aston-villa"

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
        // Replace with your actual ScoreAxis snippet; this generic template assumes
        // their loader reads a data-team attribute.
        return """
        <html><head><meta name='viewport' content='initial-scale=1.0, width=device-width' />
        <style>body{margin:0;padding:0;background:transparent;}</style>
        <script src='https://widgets.scoreaxis.com/widget.js'></script>
        </head><body>
        <div class='scoreaxis-widget' data-team='\(slug)' data-type='team-next-match' data-height='120'></div>
        <script>window.ScoreaxisWidget?.init();</script>
        </body></html>
        """
    }
}
