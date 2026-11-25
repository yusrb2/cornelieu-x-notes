<div align="center">
  <img src="public/cornelieu-icon.png" alt="Cornelieu X Notes icon" width="96" height="96" />
  <h1>Cornelieu X Notes</h1>
  <p><strong>100% local-first Cornell note-taking &amp; active recall study notebook for Android and the web.</strong></p>
  <p>
    <code>com.cornelieux.notes</code> · Offline-First (IndexedDB + Capacitor 8) · Bilingual (<code>id</code> / <code>en</code>) · GNU GPL-3.0
  </p>
</div>

---

## Overview & Philosophy

**Cornelieu X Notes** is a lightweight, fast, privacy-first Cornell note-taking application designed for deep reading, clear thinking, and long-term retention—with **zero backend servers, zero user accounts, and zero telemetry**.

Every note, *Cue / Notes / Summary* section, notebook, tag, bidirectional link, review schedule, and user preference stays strictly in local device storage via **IndexedDB**, packaged into a native Android experience using **Capacitor**. Rather than drowning study sessions in visual clutter, its **Pastel Clean** editorial interface foregrounds typographic hierarchy, calm contrast, and built-in **Active Recall** + **Spaced Repetition** workflows.

---

## Key Features

- **Structured Cornell Editor**: Dedicated separation of **Cue** (recall keywords and prompts), **Notes** (safe Markdown with interactive checklists, fenced code blocks, blockquotes, and `[[Wiki-Links]]`), and an anchored closing **Summary** for cognitive closure.
- **Active Recall Mode**: Masks *Notes* and *Summary* behind tactile study veils with progressive **Peek Answer** controls and non-judgmental clarity grading (**Still fuzzy** / **Clear**).
- **Daily Review Queue & Spaced Repetition**: Periodic scheduling with **Low / Normal / High** priorities, a progressive `[1, 3, 7, 14, 30, 60]`-day interval ladder, due/overdue daily queues, and quick `+1d` / `+3d` snoozes.
- **Quick Note Templates**: Five ready-to-use structures—*Blank Sheet*, *Lecture / Class*, *Meeting / Work*, *Reading / Research*, and *Troubleshooting / Technical*—automatically localized to your active language.
- **Instant Offline Search & Organization**: Notebooks/folders, normalized tags, pinning, archiving, two-way **Related Notes** and backlinks, `180ms` debounced weighted full-text search, and recoverable **Trash** with an **Undo** snackbar.
- **Data Portability & Local Backups**:
  - Export any note as structured Cornell Markdown (`.md` with YAML frontmatter) or formatted plain text (`.txt`).
  - Copy formatted note text directly to the clipboard.
  - Export full IndexedDB backups (`.json`) and restore via **Merge** or **Replace All**, or import external Markdown files into new Cornell notes.
- **Offline Bilingual Interface (`id` / `en`)**: Instant reactive switching between **Indonesian** and **English** with zero reloads or external network calls.

---

## Architecture & Tech Stack

| Layer | Technology & Implementation Details |
| :--- | :--- |
| **UI & State** | **Vite 6**, **TypeScript**, **Preact 10**, and **`@preact/signals`** with route/view code splitting (`ActiveRecallView`, `ReviewQueueView`, `SettingsView`) for fast cold starts and low memory footprint. |
| **Color System (*Pastel Clean*)** | **Tailwind CSS v4** + semantic `--cx-*` CSS custom properties tuned for WCAG AA (`>= 4.5:1`) readability:<br>• **Light Mode (*Soft Botanical & Mist Pastel*)**: bg `#F6F8F7`, surface `#FFFFFF`, subtle `#EEF3F1`, border `#DCE5E1`, ink `#1E2925` / `#556660`, primary Sage `#4A7C6F` (`#E2EFEA` soft), secondary Dusty Periwinkle `#5B6D92` (`#E7ECF6` soft for *Cue* & *Recall*), warm Sand `#9A6B42` (`#F7EDE2` soft for *Review* cues).<br>• **Dark Mode (*Muted Dusk Pastel*)**: bg `#141817`, surface `#1B201F` / `#222826`, ink `#E7ECEA` / `#9AA8A3`, desaturated Sage `#7DB3A4`, Periwinkle `#93A6CE`, Sand `#D4A373`. |
| **Bundled Editorial Typography** | Offline Latin `.woff2` font subsets bundled in `public/fonts/`: **Newsreader** (`600`) for headings, **Plus Jakarta Sans** (`400–700`, `line-height: 1.65`) for prose and summaries, and **JetBrains Mono** (`400–600`, tabular numerals) for *Cues*, metadata, and code blocks—paired with fluid `clamp()` sizing and a user-configurable `90%`–`125%` scale. |
| **Local Storage** | **IndexedDB** via **`idb`** (`cornelieu-x-notes-db`) across three object stores (`notes`, `notebooks`, `preferences`), featuring `350ms` debounced autosave and transactional notebook detachment and backup restoration. |
| **Android Wrapper** | **Capacitor 8** (`@capacitor/core`, `@capacitor/android`, `@capacitor/keyboard`, `@capacitor/status-bar`), `minSdkVersion 24`, `compileSdkVersion 36`, `targetSdkVersion 36`, `windowSoftInputMode="adjustResize"`, `env(safe-area-inset-*)` edge padding, `visualViewport` / orientation / virtual keyboard offset sync, and adaptive *Cornelieu* launcher mipmaps. |

---

## Multi-Breakpoint Responsive Layout

| Viewport Tier | Width Range | Layout Behavior |
| :--- | :--- | :--- |
| **Mobile Compact** | `< 600px` | Stacked *Cue* + *Notes* layout with a fast column focus toggle (*All* \| *Cue Only* \| *Notes Only*), bottom thumb-zone navigation (`min-height: 48px`), and modal bottom sheets. |
| **Mobile Landscape & Small Tablet** | `600px – 899px` | Compact `76px` left navigation rail paired with a proportional `35% Cue / 65% Notes` split canvas. |
| **Large Tablet & Desktop** | `>= 900px` (`>= 1280px` wide) | Three-zone workspace (*Library & Notebooks Sidebar* + *Notes List Pane* + *Cornell Editor Canvas* capped at a `70ch` max reading measure) plus full-screen **Focus** and **Active Recall** modes. |

---

## Offline Bilingual Architecture (`id` & `en`)

Localization is powered by a zero-bloat, 100% offline TypeScript + `@preact/signals` engine built directly in [src/i18n/index.ts](src/i18n/index.ts), with master dictionaries in [src/i18n/locales/id.ts](src/i18n/locales/id.ts) and [src/i18n/locales/en.ts](src/i18n/locales/en.ts):

- **Compile-Time Schema Safety**: Every key path forms a union type `TranslationKey`, and `en.ts` is checked against `DeepStringRecord<typeof id>` so missing or mismatched keys fail `npm run typecheck`. Placeholder consistency (`{count}`, `{days}`, `{title}`, etc.) is also verified by automated tests in [src/test/i18n.test.ts](src/test/i18n.test.ts).
- **Automatic First-Launch Detection & Persistence**: On first launch when `preferences.locale` is `null`, `detectDeviceLocale()` inspects `navigator.language` (selecting `'id'` when starting with `id`, otherwise `'en'`), seeds the welcome notebook and starter guide note via [src/db/seed.ts](src/db/seed.ts) in that language, and saves the choice in IndexedDB (`preferences`).
- **Instant Reactive Switching**: Tapping the quick **ID / EN** pill in the top header ([src/app.tsx](src/app.tsx)) or choosing a language in **Settings** ([src/components/SettingsView.tsx](src/components/SettingsView.tsx)) updates `localeSignal`, syncs `<html lang>`, refreshes localized templates via [src/data/templates.ts](src/data/templates.ts), and switches `Intl.DateTimeFormat` / `Intl.NumberFormat` formatting (`id-ID` vs. `en-US`) immediately without reloading.

### Adding a New Language

1. Duplicate [src/i18n/locales/en.ts](src/i18n/locales/en.ts) to `src/i18n/locales/<code>.ts` typed as `DeepStringRecord<typeof id>` (TypeScript enforces 100% key coverage).
2. Register the new locale code, dictionary, and `Intl` formatters in [src/i18n/index.ts](src/i18n/index.ts).
3. Add localized starter templates in [src/data/templates.ts](src/data/templates.ts) and starter note copy in [src/db/seed.ts](src/db/seed.ts), plus selector buttons in [src/components/SettingsView.tsx](src/components/SettingsView.tsx) / [src/app.tsx](src/app.tsx).
4. Verify key parity, parameter interpolation, and type safety:
   ```bash
   npm run typecheck && npm test
   ```

---

## Directory Structure

```text
cornelieu-x-notes/
├── .github/workflows/
│   └── release.yml           # Automated CI verification, signed APK build & GitHub Release workflow
├── android/                  # Capacitor-generated Android Gradle project (signing + R8/ProGuard)
├── public/
│   ├── cornelieu-icon.png    # 1024x1024 brand mark, favicon-32.png, apple-touch-icon.png
│   └── fonts/                # Bundled offline .woff2 fonts (Newsreader, Plus Jakarta Sans, JetBrains Mono)
├── src/
│   ├── components/           # Adaptive shell, CornellEditor, ActiveRecallView, SearchView, ReviewQueue, Settings
│   ├── data/                 # Bilingual Cornell quick templates (templates.ts)
│   ├── db/                   # IndexedDB schema, CRUD repositories, localized seed, backup restore
│   ├── i18n/                 # Reactive offline localization engine + id/en dictionaries
│   ├── platform/             # visualViewport, orientation, virtual keyboard, and StatusBar sync
│   ├── state/                # Global state store (@preact/signals) & theme manager
│   ├── styles/               # @font-face rules, Pastel Clean design tokens, and responsive CSS
│   ├── test/                 # i18n & localization parity tests (i18n.test.ts)
│   ├── types/                # TypeScript domain interfaces
│   ├── utils/                # Layout breakpoints, safe Markdown renderer, search, SRS, export/import
│   ├── app.tsx               # Root app workspace, three-zone desktop layout, and quick language switcher
│   └── main.tsx              # Entry point and mobile viewport initialization
├── tests/                    # Core unit tests (storage, markdown, search, spacedRepetition, exportImport, layout)
├── capacitor.config.ts       # Capacitor config (appId: com.cornelieux.notes)
├── vite.config.ts            # Vite bundler & chunk splitting config
├── vitest.config.ts          # Vitest test configuration
└── LICENSE                   # GNU General Public License v3.0 text
```

---

## Local Development & Scripts

### Prerequisites

- **Web / Tests**: Node.js `20+` and `npm`
- **Native Android Builds**: **JDK 21** and **Android Studio** with **Android SDK Platform 36** and Android SDK Build-Tools

### Commands & Scripts

| Command | Description |
| :--- | :--- |
| `npm install` | Install project dependencies into `node_modules/`. |
| `npm run dev` | Start the local Vite development server. |
| `npm run typecheck` | Run strict TypeScript type-checking (`tsc --noEmit`). |
| `npm test` | Run the full Vitest test suite (`tests/**/*.test.ts` and `src/test/**/*.test.ts`). |
| `npm run build` | Bundle the optimized production web build into `dist/`. |
| `npm run preview` | Preview the built `dist/` bundle locally. |
| `npm run cap:sync` | Run `npm run build` followed by `npx cap sync android`. |
| `npx cap sync android` | Sync compiled web assets and Capacitor plugins (`@capacitor/keyboard`, `@capacitor/status-bar`) into `android/`. |
| `npm run cap:open:android` | Open the native project in Android Studio for building, signing, or emulator testing. |

### Building Locally via Gradle CLI

```bash
# 1. Build web assets and sync into the Android project
npm run cap:sync

# 2. Compile via Gradle from android/
cd android

# Debug APK -> android/app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleDebug

# Release AAB for Play Store (when release keystore env vars are set)
./gradlew bundleRelease
```

On Windows PowerShell or CMD, substitute `.\gradlew.bat assembleDebug` or `.\gradlew.bat bundleRelease`.

---

## Installing Release APKs (GitHub Releases & Obtainium)

1. Open the repository's **Releases** page on GitHub and download `Cornelieu-X-Notes-vX.Y.Z-release.apk`.
2. *(Optional)* Verify the download integrity against the attached `SHA256SUMS.txt`:
   ```bash
   sha256sum -c SHA256SUMS.txt
   ```
3. Open the `.apk` file on your Android device and allow **Install unknown apps** if prompted.
4. **Automatic Updates via Obtainium**: Add `https://github.com/yusrb2/cornelieu-x-notes` in **Obtainium** to track and install signed GitHub Releases automatically without any app store account.

---

## Android Release Signing & Automated GitHub Release Pipeline

The workflow [.github/workflows/release.yml](.github/workflows/release.yml) automates verification, native compilation, APK signing, checksum generation, and GitHub Release publishing whenever a `v*` tag is pushed or when triggered manually.

### How the Pipeline Works

1. Resolves `RELEASE_TAG`, derives `APP_VERSION_NAME` (stripping the leading `v`), and calculates a strictly monotonic integer `APP_VERSION_CODE` using `MAJOR * 10000 + MINOR * 100 + PATCH` (for example, `v1.2.3` becomes `10203`) so Android allows seamless in-place upgrades.
2. Validates that all four Android signing repository secrets exist before building (failing fast to avoid publishing debug-signed APKs).
3. Sets up **Node.js 22**, **JDK 21 (Temurin)**, and **Gradle**, then runs `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, and `npx cap sync android`.
4. Decodes the Base64 release keystore into the runner temp directory (`tr -d '\n\r '`), builds `./gradlew assembleRelease --no-daemon` with R8 code shrinking (`minifyEnabled true`), resource shrinking (`shrinkResources true`), and ProGuard keep rules ([android/app/proguard-rules.pro](android/app/proguard-rules.pro)) configured in [android/app/build.gradle](android/app/build.gradle).
5. Cleans up the decoded keystore (`if: always()`), packages `Cornelieu-X-Notes-${RELEASE_TAG}-release.apk` and `SHA256SUMS.txt`, and publishes the GitHub Release via `softprops/action-gh-release@v2`.

### One-Time Keystore & Secrets Setup

1. **Generate a release keystore locally** (store the `.jks` file safely *outside* the repository; `*.jks`, `*.keystore`, and `keystore.properties` are ignored by `.gitignore`):
   ```bash
   keytool -genkeypair -v \
     -keystore cornelieu-release.jks \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias cornelieu
   ```
2. **Encode the keystore as a single-line Base64 string**:
   - **Linux / macOS**:
     ```bash
     base64 -w 0 cornelieu-release.jks
     # On macOS if -w is unavailable:
     base64 -i cornelieu-release.jks | tr -d '\n'
     ```
   - **Windows PowerShell**:
     ```powershell
     [Convert]::ToBase64String([IO.File]::ReadAllBytes("cornelieu-release.jks"))
     ```
3. **Add the 4 GitHub Repository Secrets** (*Settings -> Secrets and variables -> Actions -> New repository secret*):

   | Secret Name | Value |
   | :--- | :--- |
   | `ANDROID_KEYSTORE_BASE64` | Single-line Base64 string encoded from your `.jks` file. |
   | `ANDROID_KEYSTORE_PASSWORD` | Password used for the keystore in `keytool`. |
   | `ANDROID_KEY_ALIAS` | Key alias inside the keystore (e.g., `cornelieu`). |
   | `ANDROID_KEY_PASSWORD` | Password for the private key entry matching the alias. |

4. **Trigger an Automated Release**:
   - **Via Git tag** (recommended):
     ```bash
     git tag v1.0.0
     git push origin v1.0.0
     ```
   - **Manually**: Open **Actions -> Release Android APK -> Run workflow** on GitHub and enter a version tag (e.g., `v1.0.0`).

---

## License

Licensed under the **GNU General Public License v3.0 (GPL-3.0)** — Copyright (C) 2026 Yusar Brian Sadella. See [LICENSE](LICENSE) for the full license text.
