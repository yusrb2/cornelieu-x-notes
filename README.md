# Cornelieu X Notes

Aplikasi catatan metode Cornell berbasis Android (`com.cornelieux.notes`) yang berjalan 100% *local-first* tanpa backend server, akun login, atau telemetri eksternal. Seluruh data catatan, struktur *Cue / Notes / Summary*, notebook, tag, tautan referensi, jadwal review, dan preferensi disimpan langsung di perangkat menggunakan IndexedDB dan dibungkus menjadi proyek Android native melalui Capacitor.

## Arsitektur & Stack Teknis

- **Antarmuka & State**: Vite 6, TypeScript, Preact 10, dan `@preact/signals` dengan *code splitting* (`ActiveRecallView`, `ReviewQueueView`, `SettingsView`) untuk mempercepat *cold start* dan menekan konsumsi RAM.
- **Sistem Warna Pastel Clean**: Tailwind CSS v4 + CSS Custom Properties (`--cx-*`) dengan kontras baca WCAG AA (>= 4.5:1):
  - **Light Mode (*Soft Botanical & Mist Pastel*)**: latar `--cx-bg` `#F6F8F7`, kanvas `--cx-surface` `#FFFFFF`, permukaan lembut `#EEF3F1`, garis halus `#DCE5E1`, teks `#1E2925` / `#556660`, aksen utama Sage `#4A7C6F` (latar `#E2EFEA`), aksen sekunder Dusty Periwinkle `#5B6D92` (latar `#E7ECF6` untuk kolom *Cue* & *Active Recall*), serta aksen hangat Sand `#9A6B42` (latar `#F7EDE2` untuk antrean *review*).
  - **Dark Mode (*Muted Dusk Pastel*)**: latar `#141817`, permukaan `#1B201F` / `#222826`, teks `#E7ECEA` / `#9AA8A3`, serta aksen pastel redup Sage `#7DB3A4`, Periwinkle `#93A6CE`, dan Sand `#D4A373`.
- **Tipografi Editorial Offline**: Font `.woff2` subset Latin dibundel langsung di `public/fonts/` tanpa ketergantungan jaringan: **Newsreader** (`600`) untuk judul dan heading, **Plus Jakarta Sans** (`400–700`) untuk isi catatan dan ringkasan (`line-height: 1.65`), serta **JetBrains Mono** (`400–600`) untuk *Cue*, metadata, blok kode, dan *tabular numerals*. Skala ukuran dan jarak halaman memakai `clamp()` fluida dengan pengali preferensi (`90%`–`125%`).
- **Penyimpanan Lokal**: IndexedDB melalui wrapper `idb` (`cornelieu-x-notes-db`) dengan tiga *object store* (`notes`, `notebooks`, `preferences`), penyimpanan otomatis ter-*debounce* (`350ms`), dan operasi transaksional saat menghapus notebook atau memulihkan cadangan.
- **Dukungan Multibahasa Offline (`id` / `en`)**: Modul i18n TypeScript + `@preact/signals` ringan tanpa pustaka eksternal tambahan. Bahasa terdeteksi otomatis dari `navigator.language` saat peluncuran pertama, tersimpan persisten di IndexedDB (`preferences.locale`), dan dapat diganti seketika via tombol cepat `ID / EN` di header atau menu **Setelan**.
- **Mobile Wrapper Android**: Capacitor 8 (`@capacitor/core`, `@capacitor/android`, `@capacitor/keyboard`, `@capacitor/status-bar`), `minSdkVersion` 24, `compileSdkVersion` 36, `targetSdkVersion` 36, `windowSoftInputMode="adjustResize"`, *safe-area* (`env(safe-area-inset-*)`), ikon peluncur adaptif *Cornelieu*, serta sinkronisasi `visualViewport`, orientasi (*portrait ↔ landscape*), dan *keyboard offset*.

## Dukungan Multibahasa & Menambah Bahasa Baru

Aplikasi menyediakan **Bahasa Indonesia (`id`)** dan **English (`en`)** secara penuh di seluruh antarmuka, 5 template awal (`blank`, `lecture`, `meeting`, `reading`, `technical`), panduan awal pertama kali (*seed*), pesan validasi impor/ekspor, label jadwal review, serta pemformatan tanggal/angka berbasis `Intl` (`id-ID` dan `en-US`).

Untuk menambahkan bahasa baru (misalnya `es` atau `ja`):
1. Salin [src/i18n/locales/en.ts](src/i18n/locales/en.ts) ke `src/i18n/locales/<kode>.ts` bertipe `DeepStringRecord<typeof id>` (compiler TypeScript otomatis memeriksa kesesuaian seluruh key).
2. Daftarkan kamus baru di tipe `Locale`, objek `DICTIONARIES`, serta formatter `Intl` pada [src/i18n/index.ts](src/i18n/index.ts).
3. Tambahkan konten lokal pada [src/data/templates.ts](src/data/templates.ts) dan [src/db/seed.ts](src/db/seed.ts), lalu opsi pemilih di `SettingsView.tsx` / `app.tsx`.
4. Verifikasi paritas kunci dan placeholder dengan `npm run typecheck && npm test`.

## Tata Letak Responsif Multi-Breakpoint

- **Mobile Compact (`< 600px`)**: Tata letak *stacked* untuk pasangan *Cue* / *Notes* dengan filter cepat kolom (*Semua* | *Cue Saja* | *Notes Saja*), navigasi bawah di *thumb zone* (`min-height: 48px`), dan *bottom sheets*.
- **Mobile Landscape & Tablet Kecil (`600px – 899px`)**: *Navigation rail* ramping (`76px`) di sisi kiri dan transisi otomatis ke *split-view* proporsional `35% Cue / 65% Notes`.
- **Tablet Besar & Desktop (`>= 900px` dan `>= 1280px`)**: Workspace tiga zona (*Sidebar Perpustakaan & Notebook* + *Panel Daftar Catatan* + *Kanvas Editor Cornell* dengan lebar baris bacaan maksimal `70ch`) dan mode *Fokus* / *Active Recall* layar penuh.

## Fitur Utama

- **Editor Metode Cornell**: Pemisahan terstruktur antara kolom *Cue* (kata kunci/pertanyaan pemicu), *Notes* (Markdown aman, *checklist* interaktif, blok kode, kutipan, dan `[[Wiki-Links]]`), serta kotak *Summary* di bagian bawah.
- **Active Recall Mode**: Menyembunyikan jawaban *Notes* dan *Summary* di balik penutup kertas dengan kontrol *Intip Jawaban* progresif serta penanda tingkat kejelasan ingatan (`Masih samar` / `Sudah jelas`).
- **Template Cepat**: *Catatan Kosong*, *Kuliah / Kelas*, *Rapat / Kerja*, *Bacaan / Riset*, dan *Troubleshooting / Teknis* (otomatis mengikuti bahasa aktif).
- **Organisasi & Pencarian Instan**: Notebook/folder, tag ter-normalisasi, pin catatan, arsip, relasi dua arah antar-catatan (*Catatan Terkait* & *backlinks*), pencarian berbobot dengan *debounce* (`180ms`), serta *Sampah / Pulihkan* dengan snackbar *Urungkan*.
- **Antrean Review & Spaced Repetition**: Jadwal review berkala dengan prioritas (`Rendah`, `Normal`, `Tinggi`), tangga interval `[1, 3, 7, 14, 30, 60]` hari, antrean harian jatuh tempo, dan opsi tunda cepat (`+1h`, `+3h`).
- **Portabilitas Data**: Ekspor catatan ke Markdown (`.md` dengan YAML frontmatter dan pemetaan `Bagian / Cue / Notes / Summary`) atau teks terformat (`.txt`), ekspor/impor cadangan penuh IndexedDB (`.json`) dengan opsi *Gabungkan (Merge)* atau *Timpa Semua (Replace)*, serta impor file Markdown eksternal.

## Struktur Direktori

```text
cornelieu-x-notes/
├── .github/workflows/
│   └── release.yml           # Pipeline build & signing APK otomatis ke GitHub Releases
├── android/                  # Proyek Gradle Android Capacitor (signing rilis + R8/ProGuard)
├── public/
│   ├── cornelieu-icon.png    # Ikon brand 1024x1024, favicon-32.png, apple-touch-icon.png
│   └── fonts/                # Aset font .woff2 offline (Newsreader, Plus Jakarta Sans, JetBrains Mono)
├── src/
│   ├── components/           # Shell adaptif, editor Cornell, Recall, Search, Review, Settings
│   ├── data/                 # Template catatan Cornell dwibahasa
│   ├── db/                   # Skema IndexedDB, repository CRUD, seed awal, dan restore backup
│   ├── i18n/                 # Engine lokalisasi ringan (@preact/signals) + kamus id/en
│   ├── platform/             # Sinkronisasi visualViewport, orientasi, keyboard, dan StatusBar Android
│   ├── state/                # Reactive signals (@preact/signals) & tema
│   ├── styles/               # @font-face (fonts.css), Pastel Clean tokens (tokens.css), & layout CSS
│   ├── test/                 # Unit test Vitest untuk modul i18n
│   ├── types/                # Definisi tipe TypeScript
│   ├── utils/                # Breakpoint layout, Markdown aman, search, spaced repetition, export/import
│   ├── app.tsx               # Root aplikasi, workspace adaptif, pengalih bahasa, dan navigasi
│   └── main.tsx              # Entry point & inisialisasi viewport mobile
├── tests/                    # Unit test Vitest (storage, markdown, search, review, export/import, layout)
├── capacitor.config.ts       # Konfigurasi Capacitor (com.cornelieux.notes)
├── vite.config.ts            # Konfigurasi Vite & chunk splitting
├── vitest.config.ts          # Konfigurasi unit test Vitest
└── LICENSE                   # Teks penuh GNU GPL-3.0
```

## Instalasi APK Rilis (GitHub Releases & Obtainium)

1. Buka halaman **Releases** pada repositori ini dan unduh berkas `Cornelieu-X-Notes-vX.Y.Z-release.apk`.
2. (Opsional) Verifikasi integritas APK menggunakan checksum SHA-256 yang disertakan:
   ```bash
   sha256sum -c SHA256SUMS.txt
   ```
3. Pasang APK langsung pada perangkat Android Anda (izinkan *Install unknown apps* jika diminta).
4. **Pembaruan Otomatis via Obtainium**: Tambahkan URL repositori `https://github.com/yusrb2/cornelieu-x-notes` di aplikasi Android **Obtainium** agar rilis terbaru bertanda tangan resmi langsung terdeteksi otomatis.

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

## Build Android & Otomatisasi Signing Release

Prasyarat tambahan untuk kompilasi native Android lokal:
- **JDK 21** (sesuai target toolchain Gradle/AGP modern)
- **Android Studio** beserta **Android SDK Platform 36** dan Android SDK Build-Tools

```bash
# Sinkronkan aset web ke proyek Android
npm run cap:sync

# Buka di Android Studio (atau jalankan ./gradlew assembleDebug dari folder android/)
npm run cap:open:android
```

### Pengaturan Keystore & GitHub Actions Release Pipeline (Sekali Saja)

Workflow [.github/workflows/release.yml](.github/workflows/release.yml) akan memverifikasi tipe, menjalankan unit test, mem-build aplikasi web, melakukan *sync* Capacitor, menandatangani APK rilis (*R8 minify & resource shrinking* aktif), menghasilkan `SHA256SUMS.txt`, dan mempublikasikan **GitHub Release** secara otomatis.

1. **Buat Release Keystore lokal** (simpan file `.jks` di tempat aman di luar repositori; ekstensi `*.jks`, `*.keystore`, dan `keystore.properties` sudah diabaikan oleh `.gitignore`):
   ```bash
   keytool -genkeypair -v \
     -keystore cornelieu-release.jks \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias cornelieu
   ```
2. **Konversi file `.jks` menjadi teks Base64 satu baris**:
   - **Linux / macOS**:
     ```bash
     base64 -w 0 cornelieu-release.jks   # atau di macOS: base64 -i cornelieu-release.jks | tr -d '\n'
     ```
   - **Windows PowerShell**:
     ```powershell
     [Convert]::ToBase64String([IO.File]::ReadAllBytes("cornelieu-release.jks"))
     ```
3. **Tambahkan 4 Secret di GitHub Repository** (*Settings -> Secrets and variables -> Actions -> New repository secret*):
   - `ANDROID_KEYSTORE_BASE64`: string Base64 hasil konversi file `.jks`
   - `ANDROID_KEYSTORE_PASSWORD`: password keystore saat menjalankan `keytool`
   - `ANDROID_KEY_ALIAS`: alias kunci (contoh: `cornelieu`)
   - `ANDROID_KEY_PASSWORD`: password alias kunci
4. **Picu Rilis APK Otomatis**:
   - **Melalui tag Git** (direkomendasikan untuk rilis versi):
     ```bash
     git tag v1.0.0
     git push origin v1.0.0
     ```
   - **Atau manual melalui GitHub Actions**: Buka tab **Actions -> Release Android APK -> Run workflow**, lalu masukkan tag versi (contoh `v1.0.0`).

> **Catatan versi Android (`APP_VERSION_CODE`)**: Workflow otomatis mengonversi tag semver `vMAJOR.MINOR.PATCH` menjadi bilangan bulat monoton `MAJOR*10000 + MINOR*100 + PATCH` (misalnya `v1.2.3` -> `10203`) agar Android selalu mengizinkan *in-place upgrade*.

## Lisensi

Proyek ini dilisensikan di bawah **GNU General Public License v3.0 (GPL-3.0)** — Copyright (C) 2026 Yusar Brian Sadella. Lihat file [LICENSE](LICENSE) untuk teks lisensi lengkap.
