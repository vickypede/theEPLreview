Here's the step-by-step process:

## **Step 1: Deploy the Updated Functions**
```bash
cd functions
npm run build
firebase deploy --only functions
```

## **Step 2: Seed the Clubs Collection**
Open your browser and go to:
```
https://us-central1-theeplreview-18b04.cloudfunctions.net/seedClubsHttp
```

You should see: `{"ok":true,"count":20}` (20 Premier League clubs)

## **Step 3: Seed the Sources Collection**
Open your browser and go to:
```
https://us-central1-theeplreview-18b04.cloudfunctions.net/seedSourcesHttp
```

You should see: `{"ok":true,"count":35}` (35 news sources)

## **Step 4: Trigger Ingestion**
Open your browser and go to:
```
https://us-central1-theeplreview-18b04.cloudfunctions.net/ingestRun
```

You should see: `{"ok":true,"processed":35,"group":"all","addedCount":X,"skippedCount":Y}`

## **Step 5: Verify in Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → Firestore Database
3. Check:
   - `/clubs` collection: Should have 20 clubs with nicknames
   - `/sources` collection: Should have 35 sources
   - `/articles` collection: Should have new articles being added

## **What This Does:**
- **Clubs**: Adds all 20 Premier League teams with nicknames (Arsenal, Gunners, AFC, etc.)
- **Sources**: Adds general news sites + club-specific fan sites
- **Ingestion**: Automatically detects clubs mentioned in articles and tags them correctly

The system will now automatically categorize articles by club even from general sources like BBC/Guardian!