# Cornelieu X Notes

Aplikasi catatan metode Cornell berbasis Android (`com.cornelieux.notes`) yang berjalan 100% *local-first* tanpa backend server, akun login, atau telemetri eksternal. Seluruh data catatan, struktur *Cue / Notes / Summary*, notebook, tag, tautan referensi, jadwal review, dan preferensi disimpan langsung di perangkat menggunakan IndexedDB dan dibungkus menjadi proyek Android native melalui Capacitor.

## Arsitektur & Stack Teknis

- **Antarmuka & State**: Vite 6, TypeScript, Preact 10, dan `@preact/signals` dengan *code splitting* (`ActiveRecallView`, `ReviewQueueView`, `SettingsView`) untuk mempercepat *cold start* dan menekan konsumsi RAM.
- **Sistem Warna Pastel Clean**: Tailwind CSS v4 + CSS Custom Properties (`--cx-*`) dengan kontras baca WCAG AA (>= 4.5:1):
  - **Light Mode (*Soft Botanical & Mist Pastel*)**: latar `--cx-bg` `#F6F8F7`, kanvas `--cx-surface` `#FFFFFF`, permukaan lembut `#EEF3F1`, garis halus `#DCE5E1`, teks `#1E2925` / `#556660`, aksen utama Sage `#4A7C6F` (latar `#E2EFEA`), aksen sekunder Dusty Periwinkle `#5B6D92` (latar `#E7ECF6` untuk kolom *Cue* & *Active Recall*), serta aksen hangat Sand `#9A6B42` (latar `#F7EDE2` untuk antrean *review*).
  - **Dark Mode (*Muted Dusk Pastel*)**: latar `#141817`, permukaan `#1B201F` / `#222826`, teks `#E7ECEA` / `#9AA8A3`, serta aksen pastel redup Sage `#7DB3A4`, Periwinkle `#93A6CE`, dan Sand `#D4A373`.
- **Tipografi Editorial Offline**: Font `.woff2` subset Latin dibundel langsung di `public/fonts/` tanpa ketergantungan jaringan: **Newsreader** (`600`) untuk judul dan heading, **Plus Jakarta Sans** (`400–700`) untuk isi catatan dan ringkasan (`line-height: 1.65`), serta **JetBrains Mono** (`400–600`) untuk *Cue*, metadata, blok kode, dan *tabular numerals*. Skala ukuran dan jarak halaman memakai `clamp()` fluida dengan pengali preferensi (`90%`–`125%`).
- **Penyimpanan Lokal**: IndexedDB melalui wrapper `idb` (`cornelieu-x-notes-db`) dengan tiga *object store* (`notes`, `notebooks`, `preferences`), penyimpanan otomatis ter-*debounce* (`350ms`), dan operasi transaksional saat menghapus notebook atau memulihkan cadangan.
- **Mobile Wrapper Android**: Capacitor 8 (`@capacitor/core`, `@capacitor/android`, `@capacitor/keyboard`, `@capacitor/status-bar`), `minSdkVersion` 24, `compileSdkVersion` 36, `targetSdkVersion` 36, `windowSoftInputMode="adjustResize"`, *safe-area* (`env(safe-area-inset-*)`), serta sinkronisasi `visualViewport`, perubahan orientasi (*portrait ↔ landscape*), dan *keyboard offset* agar kolom *Cue*, *Notes*, maupun *Summary* tetap terlihat saat mengetik.

## Tata Letak Responsif Multi-Breakpoint

- **Mobile Compact (`< 600px`)**: Tata letak *stacked* untuk pasangan *Cue* / *Notes* dengan filter cepat kolom (*Semua* | *Cue Saja* | *Notes Saja*), navigasi bawah di *thumb zone* (`min-height: 48px`), dan *bottom sheets*.
- **Mobile Landscape & Tablet Kecil (`600px – 899px`)**: *Navigation rail* ramping (`76px`) di sisi kiri dan transisi otomatis ke *split-view* proporsional `35% Cue / 65% Notes`.
- **Tablet Besar & Desktop (`>= 900px` dan `>= 1280px`)**: Workspace tiga zona (*Sidebar Perpustakaan & Notebook* + *Panel Daftar Catatan* + *Kanvas Editor Cornell* dengan lebar baris bacaan maksimal `70ch`) dan mode *Fokus* / *Active Recall* layar penuh.

## Fitur Utama

- **Editor Metode Cornell**: Pemisahan terstruktur antara kolom *Cue* (kata kunci/pertanyaan pemicu), *Notes* (Markdown aman, *checklist* interaktif, blok kode, kutipan, dan `[[Wiki-Links]]`), serta kotak *Summary* di bagian bawah.
- **Active Recall Mode**: Menyembunyikan jawaban *Notes* dan *Summary* di balik penutup kertas dengan kontrol *Intip Jawaban* progresif serta penanda tingkat kejelasan ingatan (`Masih samar` / `Sudah jelas`).
- **Template Cepat**: *Catatan Kosong*, *Kuliah / Kelas*, *Rapat / Kerja*, *Bacaan / Riset*, dan *Troubleshooting / Teknis*.
- **Organisasi & Pencarian Instan**: Notebook/folder, tag ter-normalisasi, pin catatan, arsip, relasi dua arah antar-catatan (*Catatan Terkait* & *backlinks*), pencarian berbobot dengan *debounce* (`180ms`), serta *Sampah / Pulihkan* dengan snackbar *Urungkan*.
- **Antrean Review & Spaced Repetition**: Jadwal review berkala dengan prioritas (`Rendah`, `Normal`, `Tinggi`), tangga interval `[1, 3, 7, 14, 30, 60]` hari, antrean harian jatuh tempo, dan opsi tunda cepat (`+1h`, `+3h`).
- **Portabilitas Data**: Ekspor catatan ke Markdown (`.md` dengan YAML frontmatter dan pemetaan `Bagian / Cue / Notes / Summary`) atau teks terformat (`.txt`), ekspor/impor cadangan penuh IndexedDB (`.json`) dengan opsi *Gabungkan (Merge)* atau *Timpa Semua (Replace)*, serta impor file Markdown eksternal.

## Struktur Direktori

```text
cornelieu-x-notes/
├── android/                  # Proyek Gradle Android hasil generate Capacitor
├── public/
│   └── fonts/                # Aset font .woff2 offline (Newsreader, Plus Jakarta Sans, JetBrains Mono)
├── src/
│   ├── components/           # Shell adaptif, editor Cornell, Recall, Search, Review, Settings
│   ├── data/                 # Template catatan Cornell
│   ├── db/                   # Skema IndexedDB, repository CRUD, seed awal, dan restore backup
│   ├── platform/             # Sinkronisasi visualViewport, orientasi, keyboard, dan StatusBar Android
│   ├── state/                # Reactive signals (@preact/signals) & tema
│   ├── styles/               # @font-face (fonts.css), Pastel Clean tokens (tokens.css), & layout CSS
│   ├── types/                # Definisi tipe TypeScript
│   ├── utils/                # Breakpoint layout, Markdown aman, search, spaced repetition, export/import
│   ├── app.tsx               # Root aplikasi, workspace adaptif, dan navigasi
│   └── main.tsx              # Entry point & inisialisasi viewport mobile
├── tests/                    # Unit test Vitest (storage, markdown, search, review, export/import, layout)
├── capacitor.config.ts       # Konfigurasi Capacitor (com.cornelieux.notes)
├── vite.config.ts            # Konfigurasi Vite & chunk splitting
├── vitest.config.ts          # Konfigurasi unit test Vitest
└── LICENSE                   # Teks penuh GNU GPL-3.0
```

## Pengembangan Lokal

Prasyarat: Node.js 20+ dan npm.

```bash
# 1. Instal dependensi
npm install

# 2. Jalankan server pengembangan lokal
npm run dev

# 3. Verifikasi tipe TypeScript
npm run typecheck

# 4. Jalankan seluruh unit test
npm test

# 5. Build bundel web produksi ke dist/
npm run build
```

## Build Android (APK / AAB)

Prasyarat tambahan untuk kompilasi native Android:
- **JDK 21** (sesuai target toolchain Gradle/AGP modern)
- **Android Studio** beserta **Android SDK Platform 36** dan Android SDK Build-Tools

Langkah sinkronisasi dan build:

```bash
# 1. Build aset web dan sinkronkan ke proyek Android
npm run cap:sync

# 2a. Buka proyek di Android Studio untuk build/signing/run emulator atau perangkat
npm run cap:open:android
```

Atau build langsung melalui Gradle CLI dari direktori `android/`:

```bash
cd android

# Debug APK (output di android/app/build/outputs/apk/debug/app-debug.apk)
./gradlew assembleDebug

# Release AAB untuk distribusi Play Store (setelah konfigurasi keystore signing)
./gradlew bundleRelease
```

Di Windows PowerShell / CMD, gunakan `.\gradlew.bat assembleDebug` atau `.\gradlew.bat bundleRelease`.

## Lisensi

Proyek ini dilisensikan di bawah **GNU General Public License v3.0 (GPL-3.0)** — Copyright (C) 2026 Yusar Brian Sadella. Lihat file [LICENSE](LICENSE) untuk teks lisensi lengkap.
