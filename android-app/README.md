# Android App - The EPL Review

## Overview
Native Android application for The EPL Review, built with Kotlin and Jetpack Compose.

## Shared Resources
This app leverages the existing Firebase backend and shared resources:

### Data Models
- `../app/src/types/index.ts` - Core data types (Article, Club, Publication)
- `../app/src/types/publication.ts` - Publication-specific types
- `../functions/src/seed/clubs.json` - Club definitions & metadata
- `../functions/src/seed/sources.json` - News source configurations

### Assets
- `../app/public/assets/logo/` - Logo files (PNG, WebP formats)
- `../app/public/assets/logo_header/` - Header-specific logos
- `../solidBGlogo/` - Complete logo packs with multiple sizes

### Firebase Configuration
- `../firebase.json` - Firebase project configuration
- `../firestore.rules` - Database security rules
- `../firebase-config.js` - Firebase SDK configuration

## Features
- [ ] News articles feed
- [ ] Club-specific content
- [ ] Publications/editorials
- [ ] User authentication
- [ ] Push notifications
- [ ] Offline reading

## Development Setup
1. Install Android Studio
2. Configure Firebase Android SDK
3. Add Firebase configuration files
4. Build and run

## Architecture
- **Jetpack Compose** for UI
- **Firebase Android SDK** for backend
- **Kotlin Coroutines** for async programming
- **Room** for offline storage
- **Hilt** for dependency injection
