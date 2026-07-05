# The EPL Review - Development Commands Reference

## 🚀 **Git Branching & Development Workflow**

### **Starting Mobile Development**
```bash
# Create and switch to mobile development branch
git checkout -b mobile-development

# Push new branch to GitHub
git push origin mobile-development
```

### **Working on iOS App**
```bash
# Stay on mobile-development branch
# Work on iOS app in ios-app/ folder
# Commit iOS progress
git add ios-app/
git commit -m "iOS: Add [feature description]"
git push origin mobile-development
```

### **Creating Android Branch (after iOS is complete)**
```bash
# From mobile-development branch
git checkout -b android-development

# Work on Android app in android-app/ folder
# Commit Android progress
git add android-app/
git commit -m "Android: Add [feature description]"
git push origin android-development
```

### **Quick Web Fix While Working on Mobile**
```bash
# Save current mobile work
git stash push -m "Mobile work in progress"

# Switch to main branch
git checkout main

# Make web fixes
git add .
git commit -m "Fix web: [description]"
git push origin main

# Return to mobile work
git checkout mobile-development
git stash pop
```

### **Merging Mobile Work Back to Main**
```bash
# Merge Android back to mobile-development
git checkout mobile-development
git merge android-development

# Merge everything to main
git checkout main
git merge mobile-development

# Push to production
git push origin main
```

---

## 🔥 **Firebase Commands**

### **Deploy Functions**
```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:ingestRun
firebase deploy --only functions:publishDue
```

### **Check Function Logs**
```bash
# View all function logs
firebase functions:log

# View specific function logs
firebase functions:log --only ingestRun
firebase functions:log --only publishDue
```

### **Manual Function Triggers**
```bash
# Trigger ingestion manually
curl -X GET "https://ingestrun-qmtpcrruda-uc.a.run.app?group=all&verbose=true"

# Trigger with specific group
curl -X GET "https://ingestrun-qmtpcrruda-uc.a.run.app?group=top6"
```

### **Firestore Operations**
```bash
# View recent ingestion runs
firebase firestore:get /ingestion_runs

# Check sources status
firebase firestore:get /sources
```

---

## 🌐 **Vercel Deployment Commands**

### **Deploy to Vercel**
```bash
# Deploy to production
npx vercel --prod

# Deploy with environment variables
npx vercel --prod --env

# Deploy specific directory
npx vercel --prod --cwd ./app
```

### **Check Deployment Status**
```bash
# View deployment logs
npx vercel logs

# Check deployment history
npx vercel list
```

---

## 📱 **Mobile Development Setup**

### **iOS Development**
```bash
# Navigate to iOS app directory
cd ios-app/

# Initialize iOS project (when ready)
# Use Xcode to create new iOS project
# Configure Firebase iOS SDK
# Add Firebase configuration files
```

### **Android Development**
```bash
# Navigate to Android app directory
cd android-app/

# Initialize Android project (when ready)
# Use Android Studio to create new project
# Configure Firebase Android SDK
# Add Firebase configuration files
```

---

## 🛠 **Development & Testing**

### **Local Development**
```bash
# Start Next.js development server
cd app/
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### **Firebase Local Emulation**
```bash
# Start Firebase emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only firestore,functions
```

### **Testing Commands**
```bash
# Run tests
npm test

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

---

## 🔧 **Troubleshooting Commands**

### **Git Issues**
```bash
# Reset to last commit (DANGER: loses changes)
git reset --hard HEAD

# Force push (use carefully)
git push --force-with-lease origin branch-name

# Check branch status
git status
git branch -a
```

### **Firebase Issues**
```bash
# Re-login to Firebase
firebase login

# Check Firebase project
firebase projects:list
firebase use --add

# Clear Firebase cache
firebase logout
firebase login
```

### **Vercel Issues**
```bash
# Re-login to Vercel
npx vercel login

# Clear Vercel cache
npx vercel --prod --force

# Check Vercel project
npx vercel project ls
```

---

## 📊 **Monitoring & Maintenance**

### **Check System Status**
```bash
# Check recent commits
git log --oneline -10

# Check branch differences
git diff main..mobile-development

# Check file changes
git status
git diff
```

### **Database Maintenance**
```bash
# Clean up old articles (via function)
curl -X GET "https://cleanupoldarticles-qmtpcrruda-uc.a.run.app"

# Seed clubs data
curl -X GET "https://seedclubshttp-qmtpcrruda-uc.a.run.app"

# Seed sources data
curl -X GET "https://seedsourceshttp-qmtpcrruda-uc.a.run.app"
```

---

## 🚨 **Emergency Commands**

### **Rollback Production**
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit (DANGER)
git reset --hard <commit-hash>
git push --force-with-lease origin main
```

### **Disable Functions**
```bash
# Disable specific function
firebase functions:config:set functionName.enabled=false
firebase deploy --only functions:functionName
```

---

## 📝 **Useful Aliases (Optional)**

Add these to your shell profile for faster commands:

```bash
# Git aliases
alias gs="git status"
alias ga="git add"
alias gc="git commit"
alias gp="git push"
alias gco="git checkout"
alias gb="git branch"

# Project aliases
alias dev="cd app && npm run dev"
alias build="cd app && npm run build"
alias deploy="npx vercel --prod"
alias firebase-deploy="firebase deploy --only functions"
```

---

## 🎯 **Common Scenarios**

### **Scenario 1: Starting iOS Development**
```bash
git checkout -b mobile-development
# Work on iOS app
git add ios-app/
git commit -m "iOS: Initial setup"
git push origin mobile-development
```

### **Scenario 2: Web Fix While Working on Mobile**
```bash
git stash
git checkout main
# Fix web issue
git add . && git commit -m "Fix web issue"
git push origin main
git checkout mobile-development
git stash pop
```

### **Scenario 3: Deploy Everything**
```bash
git checkout main
git merge mobile-development
git push origin main
# Vercel auto-deploys
firebase deploy --only functions
```

### **Scenario 4: Check Ingestion Status**
```bash
curl -X GET "https://ingestrun-qmtpcrruda-uc.a.run.app?group=all&verbose=true"
firebase functions:log --only publishDue
```

---

*Keep this file updated as you discover new useful commands!*
