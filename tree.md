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
│   │   │   ├── 📁 publications/    # Publication pages
│   │   │   │   ├── 📄 page.tsx     # /publications (shows PublicationsGrid)
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
│   │   │   ├── 📄 layout.tsx       # Root layout (Header + Footer)
│   │   │   ├── 📄 globals.css      # Global styles & theme
│   │   │   ├── 📄 favicon.ico      # App favicon
│   │   │   ├── 📄 icon.png         # App icon
│   │   │   └── 📄 apple-icon.png   # Apple touch icon
│   │   ├── 📁 components/          # React Components
│   │   │   ├── 📄 Landing.tsx          # Main homepage component
│   │   │   ├── 📄 Landing2.tsx         # Alternative landing page
│   │   │   ├── 📄 ArticlesList.tsx     # News articles display
│   │   │   ├── 📄 ClubsList.tsx        # Club directory listing
│   │   │   ├── 📄 ClubArticlesList.tsx # Club-specific articles
│   │   │   ├── 📄 PublicationsGrid.tsx # Publications grid display
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
│   │   │   ├── 📄 firestoreConverters.ts # Firestore data converters
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
├── 📄 todo.md                       # Todo list
├── 📄 wip.md                        # Work in progress notes
├── 📄 error.md                      # Error documentation
├── 📄 profileLanding.md             # Profile landing documentation
├── 📄 profilepage.md                # Profile page documentation
├── 📄 pub.md                        # Publication documentation
├── 📄 publications.md               # Publications documentation
└── 📄 sources.md                    # Sources documentation