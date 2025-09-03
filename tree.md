theeplreview/
├── 📁 app/                          # Next.js Frontend Application
│   ├── 📁 src/
│   │   ├── 📁 app/                 # Next.js App Router
│   │   │   ├── �� page.tsx         # Homepage (shows ArticlesList)
│   │   │   ├── �� clubs/           # Club pages
│   │   │   │   ├── �� page.tsx     # /clubs (shows ClubsList)
│   │   │   │   └── 📁 [slug]/      # Dynamic club routes
│   │   │   │       └── 📄 page.tsx # /clubs/[club-name] (shows ClubArticlesList)
│   │   │   ├── �� layout.tsx       # Root layout (Header + Footer)
│   │   │   └── �� globals.css      # Global styles
│   │   ├── 📁 components/          # React Components
│   │   │   ├── 📄 ArticlesList.tsx     # Homepage articles display
│   │   │   ├── 📄 ClubsList.tsx        # Club directory listing
│   │   │   ├── 📄 ClubArticlesList.tsx # Club-specific articles
│   │   │   ├── 📄 Header.tsx           # Global navigation header
│   │   │   └── 📄 Footer.tsx           # Global footer
│   │   ├── 📁 lib/                 # Utility libraries
│   │   │   └── �� firebase.ts      # Firebase client config
│   │   └── 📁 types/               # TypeScript definitions
│   │       └── �� index.ts         # Type definitions
│   ├── 📄 next.config.js           # Next.js configuration
│   ├── �� tailwind.config.ts       # Tailwind CSS config
│   └── 📄 package.json             # Frontend dependencies
│
├── 📁 functions/                    # Firebase Cloud Functions
│   ├── 📁 src/
│   │   ├── 📄 index.ts             # Main ingestion function (ingestRun)
│   │   └── 📁 seed/                # Data seeding
│   │       ├── �� sources.json     # News sources configuration
│   │       └── �� clubs.json       # Club definitions
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
├── �� firebase-config.js            # Firebase config
├── 📄 patch.md                      # Code patches
├── 📄 wip.md                        # Work in progress notes
└── 📄 package.json                  # Root dependencies