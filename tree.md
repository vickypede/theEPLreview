theeplreview/
├── 📁 app/                          # Next.js Frontend Application
│   ├── 📁 src/
│   │   ├── 📁 app/                 # Next.js App Router
│   │   │   ├── 📄 page.tsx         # Homepage (shows Landing component)
│   │   │   ├── 📁 clubs/           # Club pages
│   │   │   │   ├── 📄 page.tsx     # /clubs (shows ClubsList)
│   │   │   │   └── 📁 [slug]/      # Dynamic club routes
│   │   │   │       └── 📄 page.tsx # /clubs/[club-name] (shows ClubArticlesList)
│   │   │   ├── 📁 news/            # News pages
│   │   │   │   └── 📄 page.tsx     # /news (shows ArticlesList)
│   │   │   ├── 📁 table/           # League table
│   │   │   │   └── 📄 page.tsx     # /table (shows TeamPanel)
│   │   │   ├── 📁 profile/         # User profile
│   │   │   │   └── 📄 page.tsx     # /profile (user settings)
│   │   │   ├── 📁 admin/           # Admin panel
│   │   │   │   └── 📄 page.tsx     # /admin (admin dashboard)
│   │   │   ├── 📄 layout.tsx       # Root layout (Header + Footer + favicon)
│   │   │   └── 📄 globals.css      # Global styles & theme
│   │   ├── 📁 components/          # React Components
│   │   │   ├── 📄 Landing.tsx          # Main homepage component
│   │   │   ├── 📄 ArticlesList.tsx     # News articles display
│   │   │   ├── 📄 ClubsList.tsx        # Club directory listing
│   │   │   ├── 📄 ClubArticlesList.tsx # Club-specific articles
│   │   │   ├── 📄 Header.tsx           # Global navigation header
│   │   │   ├── 📄 Footer.tsx           # Global footer
│   │   │   ├── 📄 TeamPanel.tsx        # Team statistics widget
│   │   │   ├── 📄 LoginModal.tsx       # Authentication modal
│   │   │   └── 📄 AdminGuard.tsx       # Admin route protection
│   │   ├── 📁 lib/                 # Utility libraries
│   │   │   ├── 📄 firebase.ts      # Firebase client config
│   │   │   └── 📄 useEnsureProfile.ts # Profile auto-creation hook
│   │   ├── 📁 hooks/               # Custom React hooks
│   │   │   └── 📄 useAuthGate.tsx  # Authentication gate hook
│   │   └── 📁 types/               # TypeScript definitions
│   │       └── 📄 index.ts         # Type definitions
│   ├── 📁 public/                  # Static assets
│   │   ├── 📁 assets/              # Logo assets
│   │   │   ├── 📁 logo_header/     # Header logos
│   │   │   └── 📁 logo_stacked/    # Stacked logos
│   │   └── 📄 pink_stacked.png     # Favicon
│   ├── 📄 next.config.js           # Next.js configuration
│   ├── 📄 tailwind.config.ts       # Tailwind CSS config
│   └── 📄 package.json             # Frontend dependencies
│
├── 📁 functions/                    # Firebase Cloud Functions
│   ├── 📁 src/
│   │   ├── 📄 index.ts             # Main ingestion function (ingestRun)
│   │   └── 📁 seed/                # Data seeding
│   │       ├── 📄 sources.json     # News sources configuration
│   │       └── 📄 clubs.json       # Club definitions
│   ├── 📄 package.json             # Backend dependencies
│   └── 📄 tsconfig.json            # TypeScript config
│
├── 📁 docs/                         # Documentation
├── 📁 infra/                        # Infrastructure (Firecrawl upstream)
├── 📁 public/                       # Static assets
├── 📁 sources/                      # Source files
│   ├── 📄 sources.md                # News sources list
│   └── 📄 sources_sportwitness.json # SportWitness sources
│
├── 📄 firebase.json                 # Firebase configuration
├── 📄 firestore.rules               # Firestore security rules
├── 📄 firestore.indexes.json        # Firestore indexes
├── 📄 firebase-config.js            # Firebase config
├── 📄 patch.md                      # Code patches
├── 📄 wip.md                        # Work in progress notes
└── 📄 package.json                  # Root dependencies