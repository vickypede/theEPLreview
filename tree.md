theeplreview/
├── 📁 app/                          # Next.js Frontend Application
│   ├── 📁 src/
│   │   ├── 📁 app/                 # Next.js App Router
│   │   │   ├── 📄 page.tsx         # Homepage (Landing + PublicationsSection)
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
│   │   │   ├── 📁 publications/    # Publication pages
│   │   │   │   ├── 📄 page.tsx     # /publications (shows PublicationCard grid)
│   │   │   │   └── 📁 [slug]/      # Dynamic publication routes
│   │   │   │       ├── 📄 page.tsx # /publications/[slug] (shows PublicationDetail)
│   │   │   │       └── 📄 loading.tsx # Loading component
│   │   │   ├── 📁 landing2/        # Alternative landing page
│   │   │   │   └── 📄 page.tsx     # /landing2 (shows Landing2)
│   │   │   ├── 📁 admin/           # Admin panel
│   │   │   │   ├── 📄 page.tsx     # /admin (admin dashboard)
│   │   │   │   ├── 📁 sources/     # Source management
│   │   │   │   │   └── 📁 new/     # New source creation
│   │   │   │   │       └── 📄 page.tsx # /admin/sources/new
│   │   │   │   └── 📁 write/       # Content writing
│   │   │   │       └── 📄 page.tsx # /admin/write
│   │   │   ├── 📄 layout.tsx       # Root layout (Header + Footer + SEO metadata)
│   │   │   ├── 📄 globals.css      # Global styles & theme
│   │   │   ├── 📄 robots.ts        # robots.txt route
│   │   │   ├── 📄 sitemap.ts       # Dynamic sitemap route
│   │   │   ├── 📄 favicon.ico      # App favicon
│   │   │   ├── 📄 icon.png         # App icon
│   │   │   └── 📄 apple-icon.png   # Apple touch icon
│   │   ├── 📁 components/          # React Components
│   │   │   ├── 📄 Landing.tsx          # Main homepage component
│   │   │   ├── 📄 Landing2.tsx         # Alternative landing page
│   │   │   ├── 📄 ArticlesList.tsx     # News articles display
│   │   │   ├── 📄 ClubsList.tsx        # Club directory listing
│   │   │   ├── 📄 ClubArticlesList.tsx # Club-specific articles
│   │   │   ├── 📄 PublicationCard.tsx  # Individual publication card
│   │   │   ├── 📄 PublicationDetail.tsx # Publication detail view
│   │   │   ├── 📄 Header.tsx           # Global navigation header
│   │   │   ├── 📄 Footer.tsx           # Global footer
│   │   │   ├── 📄 TeamPanel.tsx        # Team statistics widget
│   │   │   ├── 📄 Stats.tsx            # Statistics component
│   │   │   ├── 📄 LoginModal.tsx       # Authentication modal
│   │   │   └── 📄 AdminGuard.tsx       # Admin route protection
│   │   ├── 📁 lib/                 # Utility libraries
│   │   │   ├── 📄 firebase.ts      # Firebase client config
│   │   │   ├── 📄 firebaseAdmin.ts # Firebase Admin SDK config
│   │   │   ├── 📄 firestoreConverters.ts # Firestore data converters
│   │   │   ├── 📄 publications.server.ts # Server-side publication helpers
│   │   │   └── 📄 useEnsureProfile.ts # Profile auto-creation hook
│   │   ├── 📁 hooks/               # Custom React hooks
│   │   │   └── 📄 useAuthGate.tsx  # Authentication gate hook
│   │   ├── 📁 types/               # TypeScript definitions
│   │   │   ├── 📄 index.ts         # Main type definitions
│   │   │   └── 📄 publication.ts   # Publication-specific types
│   │   └── 📄 icon.png             # App icon
│   ├── 📁 public/                  # Static assets
│   │   ├── 📁 assets/              # Logo assets
│   │   │   ├── 📁 logo/            # Logo files
│   │   │   │   └── 📄 pink_stacked.png
│   │   │   └── 📁 logo_header/     # Header logos
│   │   │       ├── 📄 pink_header_cut.png
│   │   │       ├── 📄 pink_header.png
│   │   │       └── 📄 pink_stacked.png
│   │   ├── 📄 pink_stacked.png     # Favicon
│   │   ├── 📄 file.svg             # File icon
│   │   ├── 📄 globe.svg            # Globe icon
│   │   ├── 📄 next.svg             # Next.js logo
│   │   ├── 📄 vercel.svg           # Vercel logo
│   │   └── 📄 window.svg           # Window icon
│   ├── 📁 out/                     # Static export output
│   ├── 📁 node_modules/            # Dependencies
│   ├── 📄 next.config.js           # Next.js configuration
│   ├── 📄 next.config.ts           # Next.js TypeScript config
│   ├── 📄 next-env.d.ts            # Next.js TypeScript definitions
│   ├── 📄 tailwind.config.ts       # Tailwind CSS config
│   ├── 📄 postcss.config.mjs       # PostCSS configuration
│   ├── 📄 eslint.config.mjs        # ESLint configuration
│   ├── 📄 tsconfig.json            # TypeScript configuration
│   ├── 📄 package.json             # Frontend dependencies
│   └── 📄 README.md                # App documentation
│
├── 📁 functions/                    # Firebase Cloud Functions
│   ├── 📁 src/
│   │   ├── 📄 index.ts             # Main ingestion function (ingestRun)
│   │   ├── 📄 cleanup.ts           # Cleanup function
│   │   └── 📁 seed/                # Data seeding
│   │       ├── 📄 sources.json     # News sources configuration
│   │       └── 📄 clubs.json       # Club definitions
│   ├── 📁 lib/                     # Compiled JavaScript
│   │   ├── 📄 index.js             # Compiled main function
│   │   ├── 📄 index.js.map         # Source map
│   │   ├── 📄 cleanup.js           # Compiled cleanup function
│   │   ├── 📄 cleanup.js.map       # Source map
│   │   └── 📁 seed/                # Compiled seed data
│   │       ├── 📄 sources.json
│   │       └── 📄 clubs.json
│   ├── 📁 scripts/                 # Utility scripts
│   │   ├── 📄 seed_clubs.ts        # Club seeding script
│   │   ├── 📄 seed_sources.ts      # Source seeding script
│   │   ├── 📄 clubs.json           # Club data
│   │   └── 📄 sources.json         # Source data
│   ├── 📁 node_modules/            # Dependencies
│   ├── 📄 package.json             # Backend dependencies
│   ├── 📄 package-lock.json        # Dependency lock file
│   ├── 📄 tsconfig.json            # TypeScript config
│   └── 📄 tsconfig.dev.json        # Development TypeScript config
│
├── 📁 ios-app/                      # iOS Swift Application
│   ├── 📄 README.md                # iOS app documentation
│   ├── 📄 .gitkeep                 # Git placeholder
│   └── 📁 [Future iOS project files]
│
├── 📁 android-app/                  # Android Kotlin/Java Application
│   ├── 📄 README.md                # Android app documentation
│   ├── 📄 .gitkeep                 # Git placeholder
│   └── 📁 [Future Android project files]
│
├── 📁 infra/                        # Infrastructure
│   └── 📁 firecrawl/               # Firecrawl integration
│       ├── 📄 docker-compose.yml   # Docker compose configuration
│       └── 📁 _upstream/           # Upstream Firecrawl repository
│           ├── 📁 apps/            # Firecrawl applications
│           ├── 📁 examples/        # Usage examples
│           ├── 📁 img/             # Images
│           ├── 📄 CLAUDE.md        # Claude documentation
│           ├── 📄 CONTRIBUTING.md  # Contributing guidelines
│           ├── 📄 docker-compose.yaml # Docker configuration
│           ├── 📄 LICENSE          # License file
│           ├── 📄 README.md        # Firecrawl documentation
│           └── 📄 SELF_HOST.md     # Self-hosting guide
│
├── 📁 public/                       # Static assets (root level)
│   ├── 📄 404.html                 # 404 error page
│   └── 📄 index.html               # Index page
│
├── 📁 sources/                      # Source files
│   └── 📄 sources_sportwitness.json # SportWitness sources
│
├── 📁 solidBGlogo/                  # Logo assets
│   ├── 📁 eplreview_logo_pack/     # Main logo pack
│   │   └── 📁 eplreview_logo/      # Logo files
│   │       ├── 📄 apple-touch-icon.png
│   │       ├── 📄 favicon.ico
│   │       ├── 📄 logo-*.png       # Various logo sizes
│   │       ├── 📄 logo-*.webp      # WebP logo formats
│   │       ├── 📄 og-image-1200x630.png
│   │       ├── 📄 og-image-1200x630.webp
│   │       ├── 📄 README.txt
│   │       └── 📄 site.webmanifest
│   └── 📁 eplreview_logo_stacked_pack/ # Stacked logo pack
│       └── 📁 eplreview_logo_stacked/  # Stacked logo files
│           ├── 📄 apple-touch-icon.png
│           ├── 📄 favicon.ico
│           ├── 📄 logo-stacked-*.png    # Various stacked logo sizes
│           ├── 📄 logo-stacked-*.webp   # WebP stacked logo formats
│           ├── 📄 og-image-1200x630.png
│           ├── 📄 og-image-1200x630.webp
│           ├── 📄 README.txt
│           └── 📄 site.webmanifest
│
├── 📁 z_archive/                    # Archived files
│   ├── 📄 auth.md                  # Authentication documentation
│   ├── 📄 commands.md              # Command reference
│   ├── 📄 css.md                   # CSS documentation
│   ├── 📄 design.md                # Design documentation
│   ├── 📄 index_backup.md          # Index backup
│   └── 📄 mobile.md                # Mobile documentation
│
├── 📁 node_modules/                 # Root dependencies
│
├── 📄 firebase.json                 # Firebase configuration
├── 📄 firestore.rules               # Firestore security rules
├── 📄 firestore.indexes.json        # Firestore indexes
├── 📄 storage.rules                 # Storage security rules
├── 📄 firebase-config.js            # Firebase config
├── 📄 package.json                  # Root dependencies
├── 📄 package-lock.json             # Root dependency lock file
├── 📄 tree.md                       # Repository structure documentation
├── 📄 fix.md                        # SSR/SEO implementation plan
├── 📄 refactor.md                   # Homepage consolidation plan
├── 📄 visibility.md                 # Google search visibility strategy
├── 📄 wip.md                        # Work in progress notes
├── 📄 error.md                      # Error documentation
├── 📄 instruction.md                # Development instructions
├── 📄 notes.md                      # Development notes
├── 📄 publications.md               # Publications documentation
└── 📄 sources.md                    # Sources documentation

## 🔄 Reusable Files for Mobile Development

### **Shared Data Models & Types**
- `app/src/types/index.ts` - Core data types (Article, Club, Publication)
- `app/src/types/publication.ts` - Publication-specific types
- `functions/src/seed/clubs.json` - Club definitions & metadata
- `functions/src/seed/sources.json` - News source configurations

### **Shared Assets & Branding**
- `app/public/assets/logo/` - Logo files (PNG, WebP formats)
- `app/public/assets/logo_header/` - Header-specific logos
- `solidBGlogo/` - Complete logo packs with multiple sizes

### **Shared Configuration**
- `firebase.json` - Firebase project configuration
- `firestore.rules` - Database security rules
- `firestore.indexes.json` - Database indexes
- `firebase-config.js` - Firebase SDK configuration

### **Shared Business Logic**
- `functions/src/index.ts` - Data ingestion & processing logic
- `app/src/lib/firestoreConverters.ts` - Data transformation utilities
- `app/src/lib/useEnsureProfile.ts` - User profile management

### **Shared Documentation**
- `publications.md` - Publication system documentation
- `sources.md` - News source documentation
- `notes.md` - Development notes & patterns

### **Mobile-Specific Benefits**
- **Same Firebase Backend**: iOS/Android apps can use identical Firestore collections
- **Unified Authentication**: Same Firebase Auth across all platforms
- **Shared Content**: Articles, publications, and club data available to all apps
- **Consistent Branding**: Same logos and visual assets across platforms
- **Unified Admin**: Manage content from web admin panel for all platforms