# Aureus

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

Modular personal super-app for Android. A central hub with self-contained mini-apps that are added as needed. Fully local — no backend, no authentication.

## Stack

| | |
|---|---|
| Framework | React Native bare (no Expo) |
| Language | TypeScript (strict) |
| Platform | Android only |
| Navigation | React Navigation v7 (Stack + Bottom Tabs) |
| State | Zustand |
| Database | SQLite (op-sqlite) |
| Icons | Material Symbols |
| UI | Custom components, dark mode only |
| Font | Manrope (6 weights) |

## Modules

### 💰 Finance
Total balance in ARS with automatic USD blue conversion. Transactions with multiple categories, monthly/installment/annual recurring expenses, trend charts by month, transaction search, record editing. Pending payments chip with configurable lookahead.

### 🔒 Hidden Gallery
PIN-protected private gallery disguised as a calculator. Imports photos/videos from the device into an internal vault. Support for folders, categories, favorites, trash, zoom, swipe between media, drag-select, note search, and native Android share target.

### 📋 Smart Clipboard
Link and note manager with a public section and a private vault (PIN). Organized by folders and tags. Copy, share, and visit links.

### 📧 Gmail Accounts
Tracks which platforms each Gmail address is registered on. Pending/completed status chips per platform, button to add a platform to all Gmail accounts at once.

### 🎯 Focus / Deep Work
Pomodoro timer with configurable sessions. Daily focus task list with checkboxes. Completed session tracking.

### 🔍 Source Finder
Reverse image search from tweets. Integration with FxTwitter for image extraction and SauceNAO for finding original sources.

### 🤖 Radar
AI-powered search query generator (Groq). Generates optimized queries for multiple platforms from a description. Searchable and saveable with notes.

### 🧮 Calculator
Basic calculator that also serves as a camouflage screen for the hidden gallery.

## Architecture

```
src/
├── app/                    # Entry point, navigation, providers
│   └── navigation/         # RootNavigator, MainTabNavigator, types
├── core/                   # Shared code
│   ├── components/         # 11 reusable components
│   ├── theme/              # Colors, typography, spacing, radii
│   ├── database/           # SQLite setup and migrations
│   ├── hooks/              # useAppPin
│   └── types/              # Global interfaces
├── features/               # Self-contained modules
│   ├── finance/
│   ├── gallery/
│   ├── clipboard/
│   ├── gmail-accounts/
│   ├── focus/
│   ├── source-finder/
│   ├── radar/
│   ├── calculator/
│   ├── home/
│   ├── modules/
│   └── profile/
└── assets/                 # Fonts, images, icons
```

Each module follows the pattern:
```
feature/
├── screens/      # Navigation screens
├── components/   # Feature-specific components
├── hooks/        # Custom hooks
├── store/        # Zustand slice
├── services/     # External APIs
├── database/     # SQLite queries
└── types/        # TypeScript interfaces
```

## Design System

- **Theme:** Dark mode only
- **Primary color:** `#e8ba30` (gold)
- **Backgrounds:** `#1a1812` (main), `#26241c` (surfaces), `#1e1e1e` (cards)
- **Font:** Manrope (300–800)
- **Components:** Button, Card, Chip, EmptyState, FAB, Header, Icon, Input, PinLock, SectionTitle
- **Effects:** Glass blur on headers, gold glow on FAB, subtle borders

## Setup

**Requirements:** Node >= 22, Android SDK, JDK 17

```bash
# Install dependencies
npm install

# Run in development
npm start
npm run android

# Build release APK
cd android && ./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

## Database

Local SQLite with ~20 tables. Idempotent migrations in `src/core/database/database.ts`. Foreign keys enabled, CASCADE deletes, automatic seeds for categories and settings.

Main tables: `app_settings`, `gmail_accounts`, `platforms`, `clipboard_links`, `clipboard_folders`, `finance_transactions`, `finance_recurring`, `finance_categories`, `focus_tasks`, `focus_sessions`, `gallery_media`, `gallery_folders`, `source_finder_searches`, `radar_searches`.

## External Services

| Service | Purpose |
|---|---|
| Dolar Blue API | USD exchange rate for finance |
| SauceNAO | Reverse image search |
| FxTwitter | Tweet image extraction |
| Groq API | AI query generation (Radar) |

## License

MIT
