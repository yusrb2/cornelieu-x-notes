# Cornelieu X Notes

Aplikasi catatan metode Cornell berbasis Android (`com.cornelieux.notes`) yang berjalan 100% *local-first* tanpa backend server, akun login, atau telemetri eksternal. Seluruh data catatan, struktur *Cue / Notes / Summary*, notebook, tag, tautan referensi, jadwal review, dan preferensi disimpan langsung di perangkat menggunakan IndexedDB dan dibungkus menjadi proyek Android native melalui Capacitor.

## Arsitektur & Stack Teknis

- **Antarmuka & State**: Vite 6, TypeScript, Preact 10, dan `@preact/signals` dengan *code splitting* (`ActiveRecallView`, `ReviewQueueView`, `SettingsView`) untuk mempercepat *cold start* dan menekan konsumsi RAM.
- **Styling & Design System**: Tailwind CSS v4 + CSS Custom Properties (`--cx-*`) untuk tema terang kertas editorial (`#F7F5F0` / `#FCFBF8`), tema gelap (`#151614` / `#1C1E1B`), skala tipografi dinamis (`90%`–`125%`), *tabular numerals*, serta transisi CSS native.
- **Penyimpanan Lokal**: IndexedDB melalui wrapper `idb` (`cornelieu-x-notes-db`) dengan tiga *object store* (`notes`, `notebooks`, `preferences`), penyimpanan otomatis ter-*debounce* (`350ms`), dan operasi transaksional saat menghapus notebook atau memulihkan cadangan.
- **Mobile Wrapper Android**: Capacitor 8 (`@capacitor/core`, `@capacitor/android`, `@capacitor/keyboard`, `@capacitor/status-bar`), `minSdkVersion` 24, `compileSdkVersion` 36, `targetSdkVersion` 36, `windowSoftInputMode="adjustResize"`, penyesuaian *safe area* (`env(safe-area-inset-*)`), serta sinkronisasi `visualViewport` agar area ketik *Cue*, *Notes*, dan *Summary* tidak tertutup keyboard virtual.

## Fitur Utama

- **Editor Metode Cornell**: Pemisahan terstruktur antara kolom *Cue* (kata kunci/pertanyaan pemicu), *Notes* (isi utama dengan Markdown aman, *checklist* interaktif, blok kode, kutipan, dan `[[Wiki-Links]]`), serta kotak *Summary* di bagian bawah.
- **Mode Tampilan Adaptif**:
  - **Tulis & Baca**: Tata letak *Stacked* (vertikal untuk layar sempit) atau *Split* (`32%` Cue / `68%` Notes dengan garis vertikal Cornell untuk orientasi *landscape*/tablet), serta mode *Fokus* minim distraksi.
  - **Active Recall**: Menyembunyikan jawaban *Notes* dan *Summary* di balik penutup kertas dengan kontrol *Intip Jawaban* progresif serta penanda tingkat kejelasan ingatan (`Masih samar` / `Sudah jelas`).
- **Template Cepat**: Template siap pakai untuk *Catatan Kosong*, *Kuliah / Kelas*, *Rapat / Kerja*, *Bacaan / Riset*, dan *Troubleshooting / Teknis*.
- **Organisasi & Pencarian Instan**: Notebook/folder, tag ter-normalisasi, pin catatan, arsip, relasi dua arah antar-catatan (*Catatan Terkait* & *backlinks*), pencarian berbobot dengan *debounce* (`180ms`), serta *Sampah / Pulihkan* dengan snackbar *Urungkan*.
- **Antrean Review & Spaced Repetition**: Jadwal review berkala dengan prioritas (`Rendah`, `Normal`, `Tinggi`), tangga interval `[1, 3, 7, 14, 30, 60]` hari, antrean harian jatuh tempo, dan opsi tunda cepat (`+1h`, `+3h`).
- **Portabilitas Data**: Ekspor catatan individual ke Markdown (`.md` dengan YAML frontmatter dan pemetaan `Bagian / Cue / Notes / Summary`) atau teks terformat (`.txt`), ekspor/impor cadangan penuh IndexedDB (`.json`) dengan opsi *Gabungkan (Merge)* atau *Timpa Semua (Replace)*, serta impor file Markdown eksternal.

## Struktur Direktori

```text
cornelieu-x-notes/
├── android/                  # Proyek Gradle Android hasil generate Capacitor
├── src/
│   ├── components/           # Shell adaptif, editor Cornell, Recall, Search, Review, Settings
│   ├── data/                 # Template catatan Cornell
│   ├── db/                   # Skema IndexedDB, repository CRUD, seed awal, dan restore backup
│   ├── platform/             # Sinkronisasi visualViewport, keyboard, dan StatusBar Android
│   ├── state/                # Reactive signals (@preact/signals) & tema
│   ├── styles/               # Design tokens (--cx-*) dan base CSS
│   ├── types/                # Definisi tipe TypeScript
│   ├── utils/                # Parser Markdown aman, search, spaced repetition, export/import
│   ├── app.tsx               # Root aplikasi dan navigasi
│   └── main.tsx              # Entry point & inisialisasi viewport mobile
├── tests/                    # Unit test Vitest (storage, markdown, search, review, export/import)
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
