# The EPL Review

The EPL Review is an automated, highly-personalized Premier League news aggregator. It delivers curated, club-specific content from official and high-quality unofficial sources, prioritizing an engaging, app-like user experience.

## 🚀 Architecture

This project employs a robust, serverless architecture separated into a frontend client and a backend data-ingestion engine.

### Frontend (`/app`)
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Data Fetching**: React Server Components (RSC) and Firebase client SDK
- **Integrations**: ScoreAxis widgets for live league tables and club statistics
- **Deployment**: Vercel

### Backend (`/functions`)
- **Infrastructure**: Firebase Cloud Functions (Gen 2) & Cloud Firestore
- **Data Pipeline**: Automated CRON jobs run headless scraping and RSS feed parsing to continuously populate the database.
- **Content Processing**: Deterministic URL hashing for deduplication, regex-based club detection, and dynamic timestamp clamping.
- **Admin Tools**: Built-in seeding scripts to manage source lists and active Premier League club data per season.

## 📁 Repository Structure

```text
├── app/               # Next.js frontend application
├── functions/         # Firebase Cloud Functions (Ingestion, Webhooks, Seeds)
├── docs/              # Architecture notes, migration plans, and documentation
├── firebase.json      # Firebase infrastructure configuration
└── firestore.rules    # Database security rules
```

## 🛠 Local Setup (Frontend)

To run the Next.js frontend locally:

1. **Install Dependencies**
   ```bash
   cd app
   npm install
   ```

2. **Run the Development Server**
   ```bash
   npm run dev
   ```

3. **View the Application**
   Open [http://localhost:3000](http://localhost:3000) with your browser.

> **Note**: The backend ingestion scripts and Firebase Functions require administrative service account credentials and cannot be deployed or executed locally without proper IAM permissions.

## 🔄 Automated Ingestion Engine
The backend engine features an autonomous scraping pipeline (`ingestRun`). It utilizes `Puppeteer` for JavaScript-heavy sources and `rss-parser` for standard feeds. It dynamically detects active clubs from articles and accurately tags them using a pre-compiled regex detector built dynamically from Firestore state.
