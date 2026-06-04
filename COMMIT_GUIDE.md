# FEETRACK • GitHub Export & Git Commit Guide

This guide describes how to export this repository and run Git commands to version control, sync, and deploy **FEETRACK** from your local machine, or publish it directly via AI Studio's export menu.

---

## 1. Exporting Your Code from AI Studio Build
You can download or connect your repository with two easy options:
- **Github Sync**: In the **Settings** menu at the top-right of your AI Studio workspace, select **"Export to GitHub"**. This will link your workspace and push code directly to a repository of your choice.
- **Zip Archive**: Select **"Download as ZIP"** in the Settings menu to download a clean, complete template directory immediately to your computer.

---

## 2. Initializing & Committing locally via Terminal

If you downloaded the code as a `.zip` archive, extract it and follow these standard commands to create a local Git repository, commit, and push it to GitHub:

### Step 1: Open Terminal and navigate to your project folder
```bash
cd /path/to/extracted/feetrack-applet
```

### Step 2: Initialize Git
```bash
git init
```

### Step 3: Add all files
This prepares all source files, configurations, and documentation under staging:
```bash
git add .
```

### Step 4: Record your first commit
```bash
git commit -m "feat: integrate Firebase Cloud Firestore backend & FEETRACK daily ledger portal"
```

### Step 5: Link your remote GitHub Repository
Create a new blank repository first on [GitHub](https://github.com/new). Do not check any boxes like "Initialize with README" or ".gitignore" as the extracted files already contain them.

Copy your remote URL (`https://github.com/your-username/your-repo-name.git`) and run:
```bash
git branch -M main
git remote add origin https://github.com/your-username/your-repo-name.git
```

### Step 6: Push your commit to the Cloud
```bash
git push -u origin main
```

---

## 3. Environment Secrets Setup (Firebase Platform Config)

Because sensitive API credentials must **never** be exposed in public source files:
The application uses the `firebase-applet-config.json` configuration in the root directory to initiate its real-time synchronization with Google Firebase Firestore. 

If you are setting this up yourself after exporting to GitHub, make sure your Firestore database is active and security rules (`firestore.rules`) have been deployed to your project. By default, the application runs in a fully functional **Local Ledger** backup mode using localized browser storage, allowing you to use every single feature offline securely.

---

*Compiled with professional care for Saako Holy Child Academy Daily Portal.*
