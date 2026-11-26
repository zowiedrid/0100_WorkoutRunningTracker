# Workout & Running Tracker

Aplikasi **Workout & Running Tracker** adalah aplikasi kebugaran terpadu berbasis Android (Jetpack Compose) yang dirancang untuk memantau dua pilar aktivitas fisik utama: latihan beban (*strength training*) dan lari (*endurance running*).

Pengguna mencatat latihan beban per split (**Push**, **Pull**, **Leg**, **Core**) beserta set, repetisi, dan beban, menyimpan **Personal Best (PB)** tiap gerakan, serta mencatat PB lari untuk jarak **5K**, **10K**, **21K**, dan **42K** beserta *pace*-nya.

- **Pengembang:** Ilham Fadhilah (`20200140100`)
- **Mata kuliah:** Pengembangan Aplikasi Mobile 2026
- **Dosen pengampu:** Haris Setyawan, S.T., M.Eng.
- **Nama repo:** `0100_WorkoutRunningTracker`
- **Desain Figma:** https://www.figma.com/design/2hlye6yfWcwbaAC8pp1Fwq

## Ringkasan Kebutuhan (SRS v1.0)

- **Autentikasi & Otorisasi:** Registrasi, login, Access Token (JWT), Refresh Token dengan rotasi, serta pembagian peran `user` dan `admin`.
- **Arsitektur Android:** Jetpack Compose murni, Navigation Compose (1 Activity), dan MVVM (`ViewModel` + `StateFlow`).
- **Backend & Database:** REST API Node.js + Express dengan MySQL 8.4 (7 tabel saling terhubung lewat foreign key).
- **Fitur CRUDS utama:** Pustaka Gerakan, Sesi Latihan, Set per Sesi, Personal Best Gerakan, dan Rekor Lari.
- **File Storage Lokal:** Ekspor/impor cadangan catatan (JSON) dan foto profil di penyimpanan privat aplikasi.

## Rencana Struktur Proyek

```text
0100_WorkoutRunningTracker/
├── android/            Aplikasi Android (Jetpack Compose, MVVM, Navigation Compose, Retrofit)
├── backend/            REST API Node.js + Express + MySQL (JWT + Refresh Token)
└── docker-compose.yml  MySQL 8.4 untuk lingkungan pengembangan
```

## Menjalankan Database & Backend

```bash
docker compose up -d                  # MySQL 8.4 di port 3307, schema otomatis dibuat
cd backend && cp .env.example .env && npm install && npm run seed && npm start
```

Seed membuat 20 gerakan global dan akun admin demo: `admin@fitlog.app` / `admin12345`.

## Status Fitur (update tiap minggu)

- [x] Minggu 1: setup proyek, tema, desain Figma
- [x] Minggu 2: skema MySQL, autentikasi API
- [ ] Minggu 3: CRUDS backend
- [ ] Minggu 4: data layer Android
- [ ] Minggu 5: login dan register
- [ ] Minggu 6: beranda, latihan, catat sesi
- [ ] Minggu 7: rekor gerakan dan lari
- [ ] Minggu 8: profil, admin, finalisasi
