# EPLreview iOS (SwiftUI) – Native App Build Plan v1.0

> Goal: Ship a **native SwiftUI** app that mirrors the Next.js site (Home, Clubs, News, Publications, Profile) while adding **native-only value** (push notifications, widgets, offline, share, bookmarks, deep links) so it’s **not a website wrapper**. Uses same **Firebase** backend (Auth, Firestore, FCM). Links to external publishers open in an **in‑app browser** with a prominent **X** to close. Manual notification trigger from your admin is supported via a Cloud Function. Numbering uses `1.0, 1.1, 1.1.1`.

---

## 1.0 Prerequisites & Dev Machines

1.1 Hardware & OS
- 1.1.1 You’ll need access to **macOS** with **Xcode 16+** to build/sign iOS. Options:
  - 1.1.1.1 Your own Mac (recommended).
  - 1.1.1.2 Cloud Mac (MacStadium, or a macOS GitHub Actions runner for CI; local debugging still needs a Mac).
- 1.1.2 iPhone/iPad for on‑device testing (optional but recommended).

1.2 Accounts & Certificates
- 1.2.1 **Apple Developer** account (you have this; $99/year).
- 1.2.2 **Firebase** project: already created for the web; we’ll add an iOS app entry.

1.3 Software
- 1.3.1 **Xcode 16+** from App Store.
- 1.3.2 **CocoaPods** not required; we’ll use **Swift Package Manager (SPM)**.
- 1.3.3 **Git**: clone the repo you showed in `tree.md`.

1.4 Repo Layout (from `tree.md`)
- 1.4.1 Create `ios-app/` as the Xcode project root — already present as a placeholder.
- 1.4.2 We will share types/assets conceptually with the web (no code‑sharing), hitting the same Firestore collections.

---

## 2.0 iOS Project Creation

2.1 New Xcode Project
- 2.1.1 Xcode → File → New → Project…
- 2.1.2 Template: **App**.
- 2.1.3 Product Name: **EPLreview**.
- 2.1.4 Interface: **SwiftUI**. Language: **Swift**.
- 2.1.5 Bundle Identifier: `com.theeplreview.ios` (adjust as needed).
- 2.1.6 Team: select your Apple Dev team. Signing: **Automatically manage signing**.
- 2.1.7 Save **inside** `ios-app/` folder in the repo.

2.2 App Targets & Capabilities
- 2.2.1 Enable **Push Notifications** capability.
- 2.2.2 Add **Background Modes** → check **Remote notifications**.
- 2.2.3 Add **Associated Domains** (for Universal Links) – we’ll configure later:
  - 2.2.3.1 `applinks:theeplreview.com` (and any other domains you serve).

2.3 Swift Packages (SPM)
- 2.3.1 Xcode → Project → Package Dependencies → `+` and add:
  - 2.3.1.1 **Firebase iOS SDK**: `https://github.com/firebase/firebase-ios-sdk` (Up to Next Major).
    - Add products: `FirebaseAuth`, `FirebaseFirestore`, `FirebaseMessaging`, `FirebaseAnalytics`, `FirebaseCrashlytics`.
  - 2.3.1.2 **GoogleSignIn**: `https://github.com/google/GoogleSignIn-iOS` (if you keep Google auth in app).
  - 2.3.1.3 **SDWebImageSwiftUI** (for remote images) – optional: `https://github.com/SDWebImage/SDWebImageSwiftUI`.
  - 2.3.1.4 **MarkdownUI** (native rendering of publications): `https://github.com/gonzalezreal/MarkdownUI`.

---

## 3.0 Firebase (iOS) Configuration

3.1 Add iOS App in Firebase Console
- 3.1.1 Firebase Console → Project settings → **iOS app** → Register with bundle id `com.theeplreview.ios`.
- 3.1.2 Download `GoogleService-Info.plist` and **add to Xcode** (EPLreview target). Ensure it’s in the app bundle.

3.2 APNs & FCM
- 3.2.1 In Apple Developer → Keys → Create a **Key** with APNs enabled; download `.p8`.
- 3.2.2 In Firebase Console → Cloud Messaging → iOS → upload APNs key (`.p8`), enter Key ID & Team ID.

3.3 Initialize Firebase in App
- 3.3.1 Create `AppDelegate.swift` to handle notifications/FCM.
- 3.3.2 In your SwiftUI `@main` app, register AppDelegate.

```swift
import SwiftUI
import Firebase
import FirebaseMessaging

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    FirebaseApp.configure()
    UNUserNotificationCenter.current().delegate = self
    UIApplication.shared.registerForRemoteNotifications()
    Messaging.messaging().delegate = self
    return true
  }

  // Ask permission when appropriate (can be in app flow)
  func requestPushAuthorization() {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
      if granted { DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() } }
    }
  }

  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken
  }

  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    // Optionally save token to Firestore, subscribe to topics below
    print("FCM token: \(fcmToken ?? "nil")")
  }
}

@main
struct EPLreviewApp: App {
  @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
  var body: some Scene { WindowGroup { RootView() } }
}
```

3.4 Firestore Setup
- 3.4.1 Turn on **local persistence** (on by default for iOS) to enable offline reads.
- 3.4.2 Create a small `FirestoreService` for typed queries (Articles, Publications, Clubs).

```swift
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
```

- 3.4.3 Project Facts (from repo)
  - Collections used: `publications`, `articles`, `user_profiles`.
  - Publications are public when `status == 'published'`, ordered by `publishedAt desc`.
  - Publication fields (subset from web types): `id`, `type`, `title`, `slug`, `content` (Markdown), `excerpt?`, `featuredImage?` (URL), `clubs[]`, `tags[]`, `authorId`, `authorByline?`, `status`, `createdAt`, `updatedAt`, `publishedAt?`, `scheduledAt?`, `readingTime?`, `wordCount?`, `seoTitle?`, `seoDescription?`.
  - Featured images are uploaded to Firebase Storage under `publications/{timestamp}_{filename}` and stored as a full download URL in `featuredImage`.
    - Example URL shape: `https://firebasestorage.googleapis.com/v0/b/<your-bucket>/o/publications%2F{timestamp}_{filename}?alt=media&token=...`.
  - Publication URLs on web use `slug` when present: `/publications/{slug}` (fallback to doc `id`).

---

## 4.0 App Architecture (SwiftUI)

4.1 Modules
- 4.1.1 **Core**: App, Theme, Routing (deep links), Utilities.
- 4.1.2 **Data**: FirestoreService, Image cache (SDWebImage), Models.
- 4.1.3 **Features**: Home, Clubs, News, Publications, Profile, Settings.
- 4.1.4 **Components**: ArticleCard, PublicationCard, ClubBadge, InAppBrowser.

4.2 Navigation Skeleton
- 4.2.1 `TabView` with tabs: **Home**, **Clubs**, **News**, **Publications**, **Profile**.
- 4.2.2 Each tab has a `NavigationStack` for pushes.

4.3 Home Screen (native, not a webview)
- 4.3.1 Sections: Latest Publications (from `/publications`), Latest News (from `/articles`), EPL Table Panel (optional minimal live data if present in web).
- 4.3.2 Tapping an external news item → In‑App Browser (Section 6.0).
- 4.3.3 Tapping a publication → Native **PublicationDetail** (MarkdownUI).

4.4 Clubs Screen
- 4.4.1 Pull `/clubs` and render badges list.
- 4.4.2 Tap a club → **ClubArticlesList** (query by `clubs array-contains`).

4.5 Publications Screen
- 4.5.1 Query `/publications` where `status == 'published'` order by `publishedAt desc`.
- 4.5.2 Publication detail renders Markdown natively; Share / Bookmark actions available.

4.6 Profile Screen
- 4.6.1 Firebase Auth state + **Sign in with Apple** (see 7.0) and Google (optional).
- 4.6.2 Favorite Club (stored in `/user_profiles/{uid}.favoriteClub`).
- 4.6.3 Notification toggles: **All publications** topic, **Club** topic, Marketing opt‑in.

---

## 5.0 In‑App Browser (with prominent X)

5.1 Preferred: **SFSafariViewController** Wrapper (privacy, cookies, reader mode, Apple‑approved)
- 5.1.1 Presents modally full‑screen with a built‑in **Done** button (works as your big “X”).
- 5.1.2 Customize tint to your brand; cannot force site dark mode, but it follows system appearance.

```swift
import SafariServices
import SwiftUI

struct SafariView: UIViewControllerRepresentable {
  let url: URL
  func makeUIViewController(context: Context) -> SFSafariViewController {
    let vc = SFSafariViewController(url: url)
    vc.preferredBarTintColor = UIColor(named: "BrandBackground")
    vc.preferredControlTintColor = UIColor(named: "BrandAccent")
    vc.dismissButtonStyle = .close  // shows an X on iOS 16+
    return vc
  }
  func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}
```

5.2 Optional: **Custom WKWebView** (only if you must control UI)
- 5.2.1 Build a sheet with a top bar containing a large **X** button.
- 5.2.2 (Optional) **Dark mode filter** toggle (experimental): apply CSS `html { filter: invert(1) hue-rotate(180deg) } img, video { filter: invert(1) hue-rotate(180deg) }` — make it **user‑opt‑in** to avoid breaking sites.

---

## 6.0 Native Features to Avoid “Website Wrapper” Rejection

6.1 Native Lists & Rendering
- 6.1.1 **No full‑page webviews** for core UX. Lists and details are **native SwiftUI**.
- 6.1.2 Publications rendered via MarkdownUI; News uses native list and opens SFSafariViewController for external URLs.

6.2 Bookmarks & Offline
- 6.2.1 Allow users to **bookmark** publications and news (save minimal fields to `/users/{uid}/bookmarks`).
- 6.2.2 Cache publication bodies locally for offline (store Markdown in on‑device Core Data/Files after first open).

6.3 Share & Haptics
- 6.3.1 System share sheet for articles/publications.
- 6.3.2 Light haptics on bookmark/share.

6.4 Widgets (Lock/Home Screen)
- 6.4.1 Add a Widget Extension showing **Latest Publication** (title + club tags). Deep links into the app.

6.5 Universal Links & Deep Linking
- 6.5.1 Tapping `https://theeplreview.com/publications/[slug]` opens the app’s detail screen directly (Section 9.0).

6.6 Accessibility & Dynamic Type
- 6.6.1 Support Dynamic Type, VoiceOver labels, sufficient contrast.

6.7 Settings Page
- 6.7.1 Toggles: Use Reader Mode (Safari when available), Dark filter in webview (beta), Notifications (topics), Marketing opt‑in.

---

## 7.0 Authentication (Firebase) + **Sign in with Apple**

> If you offer Google Sign‑In or other third‑party sign‑in, Apple requires **Sign in with Apple** as an option.

7.1 Enable in Firebase Console
- 7.1.1 Auth → Sign‑in method → Enable **Apple**. Add your Service ID/redirect as guided by Firebase docs.

7.2 App Implementation
- 7.2.1 Use `AuthenticationServices` to present Apple sign‑in.
- 7.2.2 Exchange Apple credential for Firebase credential.

```swift
import AuthenticationServices
import FirebaseAuth

final class AuthViewModel: NSObject, ObservableObject {
  @Published var user: User?

  func signInWithApple() {
    let request = ASAuthorizationAppleIDProvider().createRequest()
    request.requestedScopes = [.fullName, .email]
    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.performRequests()
  }
}

extension AuthViewModel: ASAuthorizationControllerDelegate {
  func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
    guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
          let tokenData = credential.identityToken,
          let tokenString = String(data: tokenData, encoding: .utf8) else { return }
    let provider = OAuthProvider(providerID: "apple.com")
    let authCredential = provider.credential(withIDToken: tokenString, rawNonce: nil)
    Auth.auth().signIn(with: authCredential) { result, error in
      // handle user
    }
  }
}
```

7.3 Profile Provisioning
- 7.3.1 After login, ensure `/user_profiles/{uid}` exists (mirror web hook) — store email, displayName, favoriteClub, marketingOptIn.

7.4 Google Sign‑In (Firebase)
- 7.4.1 In Firebase Console → Auth → Sign‑in method → Enable **Google**.
- 7.4.2 In Xcode → Target → Info → URL Types → add a URL Scheme using the `REVERSED_CLIENT_ID` from your `GoogleService-Info.plist`.
- 7.4.3 Add `GoogleSignIn` via SPM (already listed in 2.3.1.2).
- 7.4.4 Implementation snippet (bridged to Firebase Auth):

```swift
import GoogleSignIn
import FirebaseAuth
import UIKit

func signInWithGoogle() {
  guard let root = UIApplication.shared.connectedScenes
    .compactMap({ ($0 as? UIWindowScene)?.keyWindow })
    .first?.rootViewController else { return }

  GIDSignIn.sharedInstance.signIn(withPresenting: root) { result, error in
    if let error = error { print(error); return }
    guard let user = result?.user,
          let idToken = user.idToken?.tokenString else { return }
    let accessToken = user.accessToken.tokenString
    let credential = GoogleAuthProvider.credential(withIDToken: idToken, accessToken: accessToken)
    Auth.auth().signIn(with: credential) { authResult, error in
      if let error = error { print(error); return }
      // update state / provision profile doc if needed
    }
  }
}
```

- 7.4.5 Notes:
  - The `REVERSED_CLIENT_ID` is required for the OAuth callback.
  - If you need the Web Client ID explicitly (rare with latest SDK), add it to `GIDConfiguration` with your OAuth client.
  - Keep Apple Sign‑In available alongside Google to meet App Store policy.

---

## 8.0 Push Notifications (Manual trigger)

8.1 App Subscription Model
- 8.1.1 On first launch (post‑permission), subscribe to topics using FCM:
  - 8.1.1.1 `publications` (all publications).
  - 8.1.1.2 `club_<slug>` for a selected favorite club.

```swift
import FirebaseMessaging
func subscribeDefaultTopics(favoriteClub: String?) {
  Messaging.messaging().subscribe(toTopic: "publications")
  if let club = favoriteClub { Messaging.messaging().subscribe(toTopic: "club_\(club)") }
}
```

8.2 Cloud Function – **Manual Trigger**
- 8.2.1 Add an HTTPS function `sendPublicationPush` that an **admin** calls from your Next.js admin UI.
- 8.2.2 Sends to topic `publications` and optionally to `club_<slug>`.

```ts
// functions/src/push.ts
import { onRequest } from "firebase-functions/v2/https";
import { getMessaging } from "firebase-admin/messaging";
import { defineSecret } from "firebase-functions/params";

const ADMIN_PUSH_SECRET = defineSecret("ADMIN_PUSH_SECRET");

export const sendPublicationPush = onRequest({ secrets:[ADMIN_PUSH_SECRET] }, async (req, res) => {
  const token = req.header("x-admin-push");
  if (token !== ADMIN_PUSH_SECRET.value()) return res.status(401).send("unauthorized");

  const { title, body, url, club } = req.body;
  const topics = ["publications"].concat(club ? [`club_${club}`] : []);

  await Promise.all(topics.map(t => getMessaging().send({
    topic: t,
    notification: { title, body },
    data: { url }, // universal link to open
    apns: { payload: { aps: { sound: "default" } } }
  })));

  res.json({ ok: true, topics });
});
```

8.3 Admin Button (web)
- 8.3.1 In `/admin/write` or `/admin/publications`, add a **Send Push** button that POSTs to the function with `x-admin-push` secret.
- 8.3.2 Keep this **manual** to avoid spam.

8.4 Notification Tap → Open Detail
- 8.4.1 Include `data.url` set to the **publications URL** (e.g., `https://theeplreview.com/publications/[slug]`).
- 8.4.2 The app handles Universal Link → routing to the PublicationDetail screen (Section 9.0).

---

## 9.0 Universal Links (Open web URLs in the app)

9.1 Apple App Site Association (AASA)
- 9.1.1 Host `/.well-known/apple-app-site-association` on your domain via Next.js route; **no redirects**, **application/json**.

```json
{
  "applinks": {
    "details": [
      {
        "appID": "TEAMID.com.theeplreview.ios",
        "paths": [ "/publications/*", "/clubs/*", "/news", "/" ]
      }
    ]
  }
}
```

9.1.2 Replace `TEAMID` with your Apple Team ID.

9.2 iOS Entitlement
- 9.2.1 In Xcode target → Signing & Capabilities → **Associated Domains** → `applinks:theeplreview.com`.

9.3 App Handling
- 9.3.1 Implement `onOpenURL` in `RootView()` to parse path and navigate to the right screen.

```swift
@main
struct EPLreviewApp: App {
  @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
  var body: some Scene {
    WindowGroup {
      RootView()
        .onOpenURL { url in
          DeepLinkRouter.shared.handle(url: url)
        }
    }
  }
}
```

---

## 10.0 Theming & Design

10.1 Brand Colors (match web)
- 10.1.1 Add Color assets: `#696D7D, #6F9283, #8D9F87, #CDC6A5`.
- 10.1.2 Support **Light/Dark** appearances.

10.2 Typography
- 10.2.1 Use SF system fonts with Dynamic Type. Keep headings bold for hierarchy.

10.3 Icons
- 10.3.1 Import app icons from `solidBGlogo` packs. Provide all iOS sizes.

---

## 11.0 QA Gates (per Feature)

11.1 Home
- 11.1.1 Shows latest 10 publications and 20 news items.
- 11.1.2 External link opens in SFSafariViewController; closing returns to app.

11.2 Clubs
- 11.2.1 List 20 EPL clubs; tapping shows club‑filtered news.

11.3 Publications
- 11.3.1 Renders Markdown; supports share & bookmark; offline reread works.

11.4 Profile
- 11.4.1 Sign in with Apple works; Google sign‑in optional; favorite club saved; notifications toggles persist.

11.5 Push
- 11.5.1 Admin sends manual push; device receives; tap deep links to detail.

11.6 Deep Links
- 11.6.1 Tapping a `publications/[slug]` URL from Safari/Notes opens the app in detail view.

---

## 12.0 Analytics, Crashes & Performance

12.1 Firebase Analytics
- 12.1.1 Log events: `view_article`, `view_publication`, `bookmark_add`, `share`, `notification_open`.

12.2 Crashlytics
- 12.2.1 Verify symbol upload; do a test crash in Debug to confirm reporting.

12.3 App Privacy
- 12.3.1 Fill App Store Privacy with data types collected (analytics, identifiers if any). Avoid IDFA if not using ads (no ATT prompt required if you don’t track).

---

## 13.0 App Store Readiness

13.1 Metadata
- 13.1.1 Title, Subtitle, Keywords.
- 13.1.2 Screenshots (iPhone 6.7” & 6.1”), App Previews optional.
- 13.1.3 **Privacy Policy** & **Terms** links hosted on your domain.

13.2 Guidelines Compliance
- 13.2.1 Not a wrapper: native lists, detail rendering, widgets, push, bookmarks.
- 13.2.2 Sign in with Apple included.
- 13.2.3 External links via SafariView (approved pattern).

13.3 TestFlight → Production
- 13.3.1 Archive in Xcode → Distribute → TestFlight internal → external testers → submit for review.

---

## 14.0 CI/CD (Optional Now; Useful Later)

14.1 GitHub Actions (macOS runner)
- 14.1.1 Build and run unit/UI tests on PR.
- 14.1.2 Optional: Notarize and upload to TestFlight with API key.

14.2 Xcode Cloud
- 14.2.1 Connect GitHub repo and configure a workflow per branch.

---

## 15.0 Android Parity (Preview; full plan later)

15.1 Kotlin/Compose App
- 15.1.1 Mirror features using Firebase (Auth, Firestore, Messaging).
- 15.1.2 Use **Chrome Custom Tabs** for in‑app browser (X button in top app bar).

---

## 16.0 Appendix – Handy Snippets

16.1 SwiftUI Article List → In‑App Browser
```swift
struct NewsListView: View {
  @State private var items: [Article] = []
  @State private var safariURL: URL?

  var body: some View {
    List(items) { a in
      Button {
        if let u = URL(string: a.url) { safariURL = u }
      } label {
        VStack(alignment: .leading) {
          Text(a.title).font(.headline)
          if let pub = a.publishedAt?.dateValue() {
            Text(pub.formatted()).font(.caption).foregroundStyle(.secondary)
          }
        }
      }
    }
    .sheet(item: $safariURL) { url in SafariView(url: url) }
    .onAppear { FirestoreService.shared.latestArticles { items = $0 } }
  }
}
```

16.2 Bookmarks (Firestore subcollection)
```swift
func toggleBookmark(article: Article, uid: String) {
  let db = Firestore.firestore()
  let ref = db.collection("users").document(uid).collection("bookmarks").document(article.id ?? "")
  ref.getDocument { snap, _ in
    if let snap, snap.exists { ref.delete() } else {
      ref.setData(["title": article.title, "url": article.url, "createdAt": FieldValue.serverTimestamp()])
    }
  }
}
```

16.3 Next.js AASA route (example)
```ts
// app/src/app/.well-known/apple-app-site-association/route.ts
import { NextResponse } from 'next/server'
export function GET() {
  const body = {
    applinks: { details: [ { appID: 'TEAMID.com.theeplreview.ios', paths: ['/publications/*','/clubs/*','/news','/'] } ] }
  }
  return NextResponse.json(body, { status: 200 })
}
```

16.4 Admin Push Button (web) – minimal
```ts
async function sendPush({title, body, url, club}: {title:string; body:string; url:string; club?:string}){
  await fetch('/api/sendPush',{ method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ title, body, url, club }) })
}
```

---

## 17.0 Implementation Checklist (Do‑This‑Then‑That)

**Week 1**
- 17.1 Clone repo on Mac; create Xcode project in `ios-app/`.
- 17.2 Add Firebase via SPM; add `GoogleService-Info.plist`.
- 17.3 Implement Home/News/Clubs native lists; open links with SafariView.
- 17.4 Implement Publications detail via MarkdownUI.

**Week 2**
- 17.5 Add Sign in with Apple; provision `/user_profiles` updates.
- 17.6 Add bookmarks + share; theme & icons.
- 17.7 Implement FCM push (request permission, subscribe topics).
- 17.8 Build Cloud Function `sendPublicationPush` + admin button.

**Week 3**
- 17.9 Universal Links (AASA + router); QA deep links.
- 17.10 Add Settings toggles; optional dark filter for webview (beta).
- 17.11 Add a simple Widget (Latest Publication).
- 17.12 Analytics events + Crashlytics.

**Week 4**
- 17.13 Polishing, Accessibility pass, performance checks.
- 17.14 TestFlight; iterate; submit for review.

---

### Notes
- Keep external content in SFSafariViewController for compliance and user trust.
- Keep notifications **manual** to avoid spam; you can add rate limits in the Cloud Function.
- Add **privacy policy**/terms to the app and to App Store metadata.

**End of Plan v1.0**

