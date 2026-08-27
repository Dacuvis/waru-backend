# Waru Backend 🍽️

Backend API untuk sistem manajemen restoran dan Point of Sale (POS) **Waru** — dibangun dengan arsitektur modular modern menggunakan [Bun](https://bun.sh), [ElysiaJS](https://elysiajs.com), [MongoDB](https://mongodb.com), dan terintegrasi dengan Payment Gateway [Midtrans](https://midtrans.com).

---

## 📋 Daftar Isi

- [Tech Stack](#-tech-stack)
- [Fitur Utama](#-fitur-utama)
- [Struktur Proyek](#-struktur-proyek)
- [Prasyarat & Cara Menjalankan](#-prasyarat--cara-menjalankan)
- [Environment Variables](#-environment-variables)
- [Autentikasi & Role-Based Access Control (RBAC)](#-autentikasi--role-based-access-control-rbac)
- [Dokumentasi API Endpoints](#-dokumentasi-api-endpoints)
  - [1. Auth](#1-auth)
  - [2. Users](#2-users)
  - [3. Menu](#3-menu)
  - [4. Orders (Kasir & Pelanggan)](#4-orders-kasir--pelanggan)
  - [5. Payment (Pembayaran & Midtrans)](#5-payment-pembayaran--midtrans)
  - [6. Kitchen (Dapur)](#6-kitchen-dapur)
  - [7. Inventory (Stok Bahan Baku)](#7-inventory-stok-bahan-baku)
  - [8. Promo & Diskon](#8-promo--diskon)
  - [9. Review & Rating](#9-review--rating)
  - [10. Notification (Notifikasi Internal)](#10-notification-notifikasi-internal)
  - [11. Analytics & Laporan Bisnis](#11-analytics--laporan-bisnis)
  - [12. Business Assistant (AI Chatbot)](#12-business-assistant-ai-chatbot)
  - [13. Upload & Static Files](#13-upload--static-files)
- [Spesifikasi Standard Error (E-Series)](#-spesifikasi-standard-error-e-series)
- [Pengujian (Testing)](#-pengujian-testing)
- [Panduan Konfigurasi Tambahan](#-panduan-konfigurasi-tambahan)
  - [Konfigurasi Gmail SMTP](#konfigurasi-gmail-smtp)
  - [Konfigurasi Midtrans Payment Gateway](#konfigurasi-midtrans-payment-gateway)
- [Inspirasi Sistem POS](#-inspirasi-sistem-pos)
- [Penggunaan AI dalam Pengembangan](#-penggunaan-ai-dalam-pengembangan)
- [Lisensi](#-lisensi)

---

## 🛠️ Tech Stack

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Runtime** | [Bun](https://bun.sh) (Latest) | Runtime JavaScript/TypeScript super cepat & package manager |
| **Framework** | [ElysiaJS](https://elysiajs.com) `^1.4.29` | Web framework berbasis type-safe & high-performance |
| **Database** | [MongoDB](https://mongodb.com) (Driver `^6.0`) | NoSQL Database untuk penyimpanan dokumen fleksibel |
| **Language** | [TypeScript](https://www.typescriptlang.org/) `^5.0` | Type safety end-to-end |
| **Authentication** | [@elysia/jwt](https://github.com/elysiajs/elysia-jwt) `^1.4.2` | JWT authentication via Bearer Token & HTTP-only Cookie |
| **Payment Gateway** | [Midtrans Core API](https://midtrans.com) | Integrasi QRIS & penanganan Webhook real-time |
| **Documentation** | [@elysiajs/swagger](https://github.com/elysiajs/elysia-swagger) `^1.3.1` | OpenAPI / Swagger interactive documentation di `/docs` |
| **Email Service** | [Nodemailer](https://nodemailer.com) `^9.0.5` | Pengiriman email transaksional & token auth via SMTP |
| **Logging** | [Pino](https://github.com/pinojs/pino) & [Pino-Pretty](https://github.com/pinojs/pino-pretty) | Structured JSON logging untuk request/response & trace |
| **CORS** | [@elysia/cors](https://github.com/elysiajs/elysia-cors) `^1.4.2` | Middleware Cross-Origin Resource Sharing |

---

## ✨ Fitur Utama

- 🔐 **Autentikasi & RBAC Multi-Role**: Sistem perizinan berbasis role (`customer`, `cashier`, `kitchen`, `boss`) dengan JWT (didukung via header `Authorization: Bearer` dan cookie `waru_token`). Token autentikasi otomatis dikirimkan ke email terdaftar.
- 🍽️ **Manajemen Menu**: Pengelompokan kategori (*Heavy Food* & *Light Food*), tanda rekomendasi (*isRecommended*), dan status ketersediaan (*isAvailable*).
- 🧾 **Cashier Order & POS**: Pembuatan pesanan meja/takeaway, auto-kalkulasi subtotal & total, pelacakan status pesanan (`pending` ➔ `in_progress` ➔ `done` / `cancelled`).
- 💳 **Pembayaran Terintegrasi (Cash & QRIS Midtrans)**: Pembayaran tunai otomatis menghitung kembalian (*change*), serta pembayaran QRIS non-tunai via Midtrans Core API lengkap dengan webhook callback otomatis.
- 🍳 **Antrian Dapur (Kitchen Management)**: Pemantauan pesanan yang perlu disiapkan oleh tim dapur berdasarkan status pengerjaan secara real-time.
- 📦 **Manajemen Inventaris (Inventory)**: Pelacakan stok bahan baku, deteksi otomatis stok menipis (*low-stock alert*), dan adjustment penambahan/pengurangan stok cepat.
- 🏷️ **Promo & Diskon Dinamis**: Kupon diskon bertipe persentase (`percentage`) atau potongan tetap (`fixed`), validasi kuota penggunaan, minimum transaksi, dan masa berlaku.
- ⭐ **Ulasan & Rating (Review)**: Pengumpulan ulasan pelanggan untuk menu maupun layanan resto, kalkulasi rata-rata rating otomatis, dan kurasi ulasan publik.
- 🔔 **Pusat Notifikasi Internal**: Distribusi pesan/notifikasi internal terarah ke target role tertentu, filter belum dibaca, dan fitur *mark all as read*.
- 📊 **Laporan & Analitik Bisnis**: Agregasi penjualan, omzet harian, item menu terlaris (*top selling*), ringkasan stok, dan tren kepuasan pelanggan dengan filter periode (`today`, `week`, `month`, `year`, `custom`).
- 🤖 **Business Assistant AI**: Asisten konsultasi bisnis interaktif berbasis sesi chat untuk memberikan insight kinerja operasional dan rekomendasi strategi bisnis.
- 📁 **File Upload & Static Hosting**: Pengunggahan file single/multiple dengan validasi tipe mime & ukuran, disajikan langsung via endpoint statis `/public/*` dan `/uploads/*`.
- 📖 **Dokumentasi API Interaktif**: Akses Swagger UI langsung di browser melalui rute `/docs`.

---

## 📁 Struktur Proyek

```
waru-backend/
├── index.ts                         # Entry point aplikasi & registrasi route utama
├── package.json                     # Konfigurasi dependensi & scripts
├── bun.lock                         # Lockfile Bun
├── public/                          # Direktori file statis publik
│   └── uploads/                     # Direktori penyimpanan file upload (gambar menu, dll)
├── src/
│   ├── config/
│   │   ├── client.ts                # Inisialisasi koneksi MongoDB Client
│   │   └── midtrans.ts              # Konfigurasi Midtrans SDK & credentials
│   ├── moduls/                      # Modul fitur (Arsitektur Model-Service-Controller-Route)
│   │   ├── analytics/               # Laporan penjualan, performa menu & inventaris
│   │   ├── boss/                    # Modul kontrol eksekutif / owner
│   │   ├── business_assistant/      # Asisten AI konsultasi bisnis & riwayat chat
│   │   ├── cashier/                 # Manajemen pesanan (orders) & pembayaran (payment/Midtrans)
│   │   ├── inventory/               # Pengelolaan stok & bahan baku restoran
│   │   ├── kitchen/                 # Antrian dan status pengerjaan pesanan dapur
│   │   ├── login/                   # Autentikasi login & pengiriman token via email
│   │   ├── menu/                    # Manajemen katalog menu makanan & minuman
│   │   ├── notification/            # Notifikasi internal antar role/staf
│   │   ├── promo/                   # Pengelolaan kode promo & kalkulasi diskon
│   │   ├── register/                # Registrasi akun baru
│   │   ├── review/                  # Penilaian & ulasan pelanggan
│   │   ├── upload/                  # Upload multipart form-data & manajemen file
│   │   └── users/                   # Manajemen data pengguna & role
│   └── utils/                       # Utilitas bersama (Cross-cutting concerns)
│       ├── auth/                    # Middleware autentikasi JWT & Role Guard (RBAC)
│       ├── cookies/                 # Pengaturan & helper HTTP-only cookie token
│       ├── cors/                    # Konfigurasi CORS
│       ├── email/                   # Template & pengirim email via SMTP Nodemailer
│       ├── error/                   # Global error handler & spesifikasi kode error (E-Series)
│       ├── jwt/                     # Plugin & helper JWT (@elysia/jwt)
│       ├── logger/                  # Logger terstruktur dengan Pino
│       ├── midtrans/                # Service klien Midtrans Core API (Charge & Status Check)
│       ├── pagination/              # Helper pagination query & response builder
│       ├── security/                # Hashing & verifikasi password (bcrypt/Bun.password)
│       └── swagger/                 # Konfigurasi dokumentasi OpenAPI / Swagger
└── tests/                           # Unit test & Integration test suite
    ├── ai-endpoints.integration.mjs # Pengujian integrasi modul
    ├── jwt.test.ts                  # Pengujian sign & verify JWT
    ├── payment.test.ts              # Pengujian flow transaksi & pembayaran
    ├── rbac_phase1.test.ts          # Pengujian proteksi role-based access
    ├── upload.test.ts               # Pengujian upload file
    └── users_security.test.ts       # Pengujian keamanan user & hashing
```

---

## 🚀 Prasyarat & Cara Menjalankan

### Prasyarat Sistem
- [Bun](https://bun.sh) (v1.0 ke atas)
- Instance [MongoDB](https://www.mongodb.com) (Lokal atau MongoDB Atlas)
- Akun Gmail untuk SMTP (atau penyedia SMTP lain)
- Akun [Midtrans](https://midtrans.com) (Sandbox / Production)

### Langkah Instalasi

1. **Clone repository & masuk ke direktori proyek**:
   ```bash
   git clone <repository-url>
   cd waru-backend
   ```

2. **Install seluruh dependensi**:
   ```bash
   bun install
   ```

3. **Buat file konfigurasi environment `.env`**:
   Salin atau buat file `.env` di direktori root dengan konfigurasi berikut:

   ```env
   # Server Environment
   PORT=3000
   NODE_ENV=development

   # Database MongoDB
   MONGO_URL=mongodb://localhost:27017/waru_db

   # Autentikasi JWT
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=7d

   # Email SMTP (Gmail)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-gmail-app-password

   # Midtrans Payment Gateway
   MIDTRANS_MERCHANT_ID=your-merchant-id
   MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxx
   MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxx
   MIDTRANS_IS_PRODUCTION=false
   ```

4. **Jalankan server aplikasi**:
   - **Mode Development (dengan hot reload)**:
     ```bash
     bun --watch index.ts
     ```
   - **Mode Normal**:
     ```bash
     bun run index.ts
     ```

5. **Akses Layanan**:
   - 🌐 **Base API URL**: `http://localhost:3000`
   - 📚 **Swagger UI Documentation**: `http://localhost:3000/docs`

---

## ⚙️ Environment Variables

| Variable | Wajib | Default | Deskripsi |
| :--- | :---: | :---: | :--- |
| `MONGO_URL` | Ya | `mongodb://localhost:27017` | Connection string database MongoDB |
| `JWT_SECRET` | Ya | - | Kunci rahasia untuk menandatangani token JWT |
| `JWT_EXPIRES_IN` | Tidak | `7d` | Masa berlaku token JWT (contoh: `1h`, `1d`, `7d`) |
| `EMAIL_HOST` | Ya | `smtp.gmail.com` | Host server SMTP email |
| `EMAIL_PORT` | Ya | `587` | Port server SMTP email (TLS/STARTTLS) |
| `EMAIL_USER` | Ya | - | Alamat email pengirim |
| `EMAIL_PASS` | Ya | - | Password aplikasi (App Password) email SMTP |
| `MIDTRANS_MERCHANT_ID` | Ya | - | Merchant ID dari dashboard Midtrans |
| `MIDTRANS_CLIENT_KEY` | Ya | - | Client Key Midtrans (diawali `SB-Mid-client-` untuk sandbox) |
| `MIDTRANS_SERVER_KEY` | Ya | - | Server Key Midtrans (diawali `SB-Mid-server-` untuk sandbox) |
| `MIDTRANS_IS_PRODUCTION`| Tidak | `false` | Set `true` untuk menggunakan live/production Midtrans |

---

## 🔒 Autentikasi & Role-Based Access Control (RBAC)

Aplikasi menggunakan autentikasi JWT dengan hak akses hierarki role:

| Role | Deskripsi Hak Akses |
| :--- | :--- |
| **`customer`** | Mengakses menu publik, membuat order, melakukan pembayaran, klaim promo, memberi ulasan, dan menerima notifikasi pesanan. |
| **`cashier`** | Mengelola dan memperbarui status pesanan, memproses pembayaran tunai, memeriksa status pembayaran QRIS Midtrans, dan memantau status dapur. |
| **`kitchen`** | Mengelola antrian dapur (penerimaan s/d selesai pengerjaan), melihat stok bahan baku & melakukan penyesuaian (*adjustment*) stok, serta melihat notifikasi dapur. |
| **`boss`** | Hak akses administrator penuh: CRUD User & Role, CRUD Menu, CRUD Promo, CRUD Inventaris, membatalkan/menghapus transaksi, akses laporan analitik komprehensif, upload aset, dan asisten bisnis AI. |

### Cara Mengirimkan Kredensial Autentikasi
Klien dapat menyertakan token autentikasi dengan salah satu cara berikut:
1. **HTTP Header (Rekomendasi API/Mobile)**:
   ```http
   Authorization: Bearer <token_jwt_kamu>
   ```
2. **HTTP Cookie (Web Browser)**:
   Cookie bernama `waru_token` yang diset otomatis saat login/register.

---

## 📡 Dokumentasi API Endpoints

> 💡 **Keterangan Akses:**
> - 🌐 **Public**: Dapat diakses bebas tanpa token autentikasi.
> - 🔒 **Protected**: Wajib menyertakan JWT token dengan role yang diizinkan.

---

### 1. Auth

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :---: | :--- |
| `POST` | `/auth/register` | 🌐 Public | Mendaftarkan akun baru (`customer`), token JWT otomatis dikirim via email |
| `POST` | `/auth/login` | 🌐 Public | Autentikasi masuk pengguna, token JWT dikirim via email & response |

#### Payload `POST /auth/register`
```json
{
  "name": "Rayyan",
  "email": "rayyan@example.com",
  "password": "Password123!"
}
```

#### Payload `POST /auth/login`
```json
{
  "email": "rayyan@example.com",
  "password": "Password123!"
}
```

#### Response Sukses (Register & Login)
```json
{
  "message": "Login berhasil! Token dikirim ke email kamu.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "66c7a1b2c3d4e5f6a7b8c9d0",
    "name": "Rayyan",
    "email": "rayyan@example.com"
  }
}
```

---

### 2. Users

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :---: | :--- |
| `GET` | `/users` | 🔒 `boss` | Mengambil daftar seluruh pengguna (query: `?page=1&limit=10`) |
| `POST` | `/users` | 🔒 `boss` | Menambahkan pengguna baru dengan role tertentu (`boss`, `cashier`, `kitchen`, `customer`) |
| `PUT` | `/users/:id` | 🔒 `boss` | Memperbarui data pengguna, status aktif (`IsActive`), atau role by ID |
| `DELETE` | `/users/:id` | 🔒 `boss` | Menghapus pengguna by ID |

---

### 3. Menu

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :---: | :--- |
| `GET` | `/menu` | 🌐 Public | Mengambil daftar menu aktif (filter query: `?category=Heavy Food`, `?isAvailable=true`, `?page=1&limit=10`) |
| `GET` | `/menu/:id` | 🌐 Public | Mengambil detail menu makanan berdasarkan ID |
| `POST` | `/menu` | 🔒 `boss` | Menambahkan item menu baru |
| `PUT` | `/menu/:id` | 🔒 `boss` | Memperbarui informasi atau ketersediaan menu by ID |
| `DELETE` | `/menu/:id` | 🔒 `boss` | Menghapus item menu by ID |

#### Kategori Menu
- `"Heavy Food"`: Makanan berat / utama
- `"Light Food"`: Makanan ringan / snack / minuman

#### Contoh Payload `POST /menu`
```json
{
  "name": "Nasi Goreng Spesial",
  "description": "Nasi goreng dengan bumbu khas Waru, telur mata sapi, dan suwiran ayam",
  "price": 28000,
  "category": "Heavy Food",
  "isAvailable": true,
  "isRecommended": true,
  "imageUrl": "/uploads/nasi-goreng.webp"
}
```

---

### 4. Orders (Kasir & Pelanggan)

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :---: | :--- |
| `GET` | `/orders` | 🔒 `customer`, `cashier` | Mengambil daftar seluruh order (query: `?page=1&limit=10`) |
| `GET` | `/orders/:id` | 🔒 `customer`, `cashier` | Mengambil detail data order by ID |
| `POST` | `/orders` | 🔒 `customer`, `cashier` | Membuat pesanan baru (auto-kalkulasi subtotal & total bayar) |
| `GET` | `/orders/status/:status` | 🔒 `cashier` | Filter daftar order berdasarkan status pesanan |
| `PUT` | `/orders/:id` | 🔒 `cashier` | Memperbarui data / status pesanan |
| `DELETE` | `/orders/:id` | 🔒 `boss` | Menghapus pesanan by ID |

#### Status Order:
`pending` ➔ `in_progress` ➔ `done` | `cancelled`

#### Contoh Payload `POST /orders`
```json
{
  "customerName": "Budi Santoso",
  "tableNumber": 5,
  "items": [
    {
      "menuId": "66c7a1b2c3d4e5f6a7b8c9d0",
      "name": "Nasi Goreng Spesial",
      "price": 28000,
      "quantity": 2,
      "notes": "Pedas sedang, tanpa timun"
    }
  ]
}
```

---

### 5. Payment (Pembayaran & Midtrans)

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :---: | :--- |
| `POST` | `/payment/notification` | 🌐 Public | Webhook HTTP callback dari Midtrans saat status QRIS berubah |
| `POST` | `/payment/midtrans-webhook`| 🌐 Public | Endpoint alias webhook Midtrans |
| `GET` | `/payment` | 🔒 `customer`, `cashier` | Mengambil daftar seluruh riwayat pembayaran |
| `GET` | `/payment/order/:orderId`| 🔒 `customer`, `cashier` | Mengambil data pembayaran berdasarkan Order ID |
| `GET` | `/payment/:id` | 🔒 `customer`, `cashier` | Mengambil detail pembayaran by ID |
| `POST` | `/payment` | 🔒 `customer`, `cashier` | Membuat pembayaran (`cash` atau `qris` via Midtrans) |
| `GET` | `/payment/:id/status` | 🔒 `cashier` | Pengecekan & sinkronisasi status pembayaran QRIS ke Midtrans API |
| `PUT` | `/payment/:id` | 🔒 `cashier` | Memperbarui status pembayaran secara manual |
| `DELETE` | `/payment/:id` | 🔒 `boss` | Menghapus record pembayaran by ID |

#### Metode Pembayaran (`paymentMethod`):
- `cash`: Tunai. Parameter `amountPaid` wajib diisi (menghasilkan kalkulasi `change` / kembalian).
- `qris`: Non-tunai. Menghasilkan response QR Code string / QR URL dari Midtrans Core API.

#### Status Pembayaran:
`pending` ➔ `settlement` (sukses) | `expire` | `cancel` | `failed`

---

### 6. Kitchen (Dapur)

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :---: | :--- |
| `GET` | `/kitchen` | 🔒 `kitchen` | Mengambil semua antrian pesanan dapur (query: `?page=1&limit=10`) |
| `GET` | `/kitchen/:id` | 🔒 `kitchen` | Mengambil detail antrian pesanan dapur by ID |
| `POST` | `/kitchen` | 🔒 `kitchen` | Membuat entri antrian dapur baru |
| `PUT` | `/kitchen/:id` | 🔒 `kitchen` | Memperbarui status pengerjaan pesanan dapur |
| `GET` | `/kitchen/status/:status` | 🔒 `kitchen`, `cashier` | Filter antrian dapur berdasarkan status (`pending`, `in_progress`, `done`, `cancelled`) |
| `DELETE` | `/kitchen/:id` | 🔒 `boss` | Menghapus entri dapur by ID |

---

### 7. Inventory (Stok Bahan Baku)

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :---: | :--- |
| `GET` | `/inventory` | 🔒 `kitchen`, `boss` | Mengambil daftar semua bahan baku |
| `GET` | `/inventory/low-stock` | 🔒 `kitchen`, `boss` | Menampilkan bahan baku dengan jumlah di bawah batas minimum |
| `GET` | `/inventory/category/:category` | 🔒 `kitchen`, `boss` | Filter bahan baku berdasarkan kategori |
| `GET` | `/inventory/:id` | 🔒 `kitchen`, `boss` | Mengambil detail item inventaris by ID |
| `PATCH` | `/inventory/:id/stock` | 🔒 `kitchen`, `boss` | Menyesuaikan stok (+ penambahan atau - pengurangan) |
| `POST` | `/inventory` | 🔒 `boss` | Menambahkan item bahan baku baru |
| `PUT` | `/inventory/:id` | 🔒 `boss` | Memperbarui data bahan baku |
| `DELETE` | `/inventory/:id` | 🔒 `boss` | Menghapus item bahan baku by ID |

#### Contoh Payload `PATCH /inventory/:id/stock`
```json
{
  "amount": -5,
  "reason": "Pemakaian harian operasional dapur"
}
```

---

### 8. Promo & Diskon

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :---: | :--- |
| `GET` | `/promo/active` | 🌐 Public | Mengambil daftar promo yang sedang aktif dan berlaku |
| `POST` | `/promo/apply` | 🔒 `customer` | Memvalidasi kode promo dan mengkalkulasi potongan diskon untuk transaksi |
| `GET` | `/promo` | 🔒 `boss` | Mengambil seluruh promo (aktif & nonaktif) |
| `GET` | `/promo/:id` | 🔒 `boss` | Mengambil detail promo by ID |
| `POST` | `/promo` | 🔒 `boss` | Membuat kode promo baru |
| `PUT` | `/promo/:id` | 🔒 `boss` | Memperbarui parameter promo |
| `DELETE` | `/promo/:id` | 🔒 `boss` | Menghapus promo by ID |

#### Contoh Payload `POST /promo/apply`
```json
{
  "code": "WARUHEMAT10",
  "totalAmount": 150000
}
```

---

### 9. Review & Rating

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :---: | :--- |
| `GET` | `/review/published` | 🌐 Public | Mengambil ulasan pelanggan yang berstatus dipublikasikan |
| `GET` | `/review/rating` | 🌐 Public | Mengambil rata-rata rating (query: `?target=menu&targetId=xxx` atau `?target=service`) |
| `GET` | `/review/target/:target` | 🌐 Public | Mengambil daftar ulasan berdasarkan target (`menu` atau `service`) |
| `POST` | `/review` | 🔒 `customer` | Mengirimkan ulasan & penilaian baru |
| `GET` | `/review` | 🔒 `boss` | Mengambil seluruh ulasan pelanggan |
| `GET` | `/review/:id` | 🔒 `boss` | Mengambil detail ulasan by ID |
| `PUT` | `/review/:id` | 🔒 `boss` | Memperbarui atau memoderasi status publikasi ulasan |
| `DELETE` | `/review/:id` | 🔒 `boss` | Menghapus ulasan by ID |

---

### 10. Notification (Notifikasi Internal)

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :---: | :--- |
| `GET` | `/notification` | 🔒 `customer` | Mengambil daftar notifikasi |
| `PATCH` | `/notification/read-all` | 🔒 `customer` | Menandai seluruh notifikasi telah dibaca (opsional query: `?target=kitchen`) |
| `GET` | `/notification/unread` | 🔒 `kitchen` | Mengambil notifikasi yang belum dibaca |
| `GET` | `/notification/target/:target`| 🔒 `boss` | Mengambil notifikasi berdasarkan target peran penerima |
| `GET` | `/notification/:id` | 🔒 `boss` | Mengambil detail notifikasi by ID |
| `POST` | `/notification` | 🔒 `boss` | Mengirim notifikasi internal baru |
| `PUT` | `/notification/:id` | 🔒 `boss` | Memperbarui isi notifikasi by ID |
| `DELETE` | `/notification/:id` | 🔒 `boss` | Menghapus notifikasi by ID |

---

### 11. Analytics & Laporan Bisnis

> 🔒 **Seluruh endpoint Analytics hanya dapat diakses oleh role `boss`**.  
> Mendukung parameter rentang waktu: `?period=today | week | month | year | custom` (serta `&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` untuk periode `custom`).

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/analytics/dashboard` | Ringkasan eksekutif menyeluruh (total omzet, jumlah order, status inventaris & kepuasan pelanggan) |
| `GET` | `/analytics/sales` | Ikhtisar performa penjualan dan pendapatan |
| `GET` | `/analytics/sales/daily` | Grafik dan rincian data penjualan harian |
| `GET` | `/analytics/menu/top` | Peringkat item menu terlaris beserta kuantitas & total pendapatan (query: `?limit=5`) |
| `GET` | `/analytics/inventory` | Ringkasan kondisi stok, nilai aset bahan baku, dan item yang harus segera di-restock |
| `GET` | `/analytics/reviews` | Agregasi kepuasan ulasan pelanggan dan metrik rating |

---

### 12. Business Assistant (AI Chatbot)

> 🔒 **Seluruh endpoint Business Assistant hanya dapat diakses oleh role `boss`**.

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/assistant` | Mengambil daftar seluruh sesi percakapan asisten bisnis |
| `GET` | `/assistant/:id` | Mengambil detail sesi beserta riwayat percakapan lengkap |
| `POST` | `/assistant` | Membuat sesi percakapan baru sekaligus mengirimkan pesan pertama |
| `POST` | `/assistant/:id/message` | Mengirimkan pesan lanjutan ke dalam sesi aktif |
| `DELETE` | `/assistant/:id` | Menghapus riwayat sesi percakapan by ID |

#### Contoh Payload `POST /assistant`
```json
{
  "title": "Evaluasi Penjualan Minggu Ini",
  "message": "Bagaimana performa penjualan menu makanan berat selama akhir pekan lalu?"
}
```

---

### 13. Upload & Static Files

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :---: | :--- |
| `GET` | `/upload` | 🌐 Public | Mengambil daftar metadata file yang telah diunggah |
| `GET` | `/upload/:id` | 🌐 Public | Mengambil info metadata file berdasarkan ID |
| `POST` | `/upload` | 🔒 `boss` | Mengunggah satu file (`multipart/form-data` dengan field `file`) |
| `POST` | `/upload/single` | 🔒 `boss` | Endpoint eksplisit unggah satu file |
| `POST` | `/upload/multiple` | 🔒 `boss` | Mengunggah beberapa file sekaligus (`multipart/form-data` dengan field `files`) |
| `DELETE` | `/upload/:id` | 🔒 `boss` | Menghapus record metadata dan file fisik dari disk server |
| `GET` | `/public/*` | 🌐 Public | Mengakses static file publik (contoh: `/public/uploads/sample.jpg`) |
| `GET` | `/uploads/*` | 🌐 Public | Alias langsung untuk mengakses aset di `/public/uploads/*` |

---

## 🛡️ Spesifikasi Standard Error (E-Series)

Semua respon kesalahan dikembalikan dengan format JSON yang konsisten menggunakan standar **E-Series**:

```json
{
  "status": "error",
  "statusCode": 400,
  "code": "E10",
  "message": "Format ID yang dikirim tidak valid.",
  "details": null
}
```

### Master Error Matrix

| Kode Error | HTTP Status | Nama Error | Deskripsi / Pemicu Utama |
| :---: | :---: | :--- | :--- |
| **`E10`** | `400` / `422` | *Bad Request / Validation* | Format ID tidak valid, validasi skema input gagal, stok tidak mencukupi, atau kurang bayar. |
| **`E20`** | `401` / `403` | *Unauthorized / Forbidden* | Token JWT tidak ada, kadaluwarsa, atau role akun tidak memiliki hak akses endpoint. |
| **`E30`** | `404` | *Not Found* | Data yang dicari (User, Order, Menu, File, dll) atau endpoint URL tidak ditemukan. |
| **`E40`** | `409` | *Conflict / Duplicate* | Pelanggaran unik pada database (contoh: email sudah terdaftar, pembayaran order duplikat). |
| **`E50`** | `500` | *Internal Server Error* | Kesalahan runtime internal atau unhandled exception pada server. |
| **`E99`** | `500` / `502` | *External / Unknown Error* | Kegagalan respon dari layanan pihak ketiga (Midtrans Gateway, SMTP Server, AI engine). |

---

## 🧪 Pengujian (Testing)

Waru Backend dilengkapi suite pengujian otomatis untuk menguji unit fungsional dan integrasi sistem.

### Menjalankan Unit & Security Test (via Bun Test Runner):
```bash
# Uji fungsional JWT Token
bun test tests/jwt.test.ts

# Uji keamanan User & Password Hashing
bun test tests/users_security.test.ts

# Uji proteksi Role-Based Access Control (RBAC)
bun test tests/rbac_phase1.test.ts

# Uji modul upload file
bun test tests/upload.test.ts

# Uji modul transaksi & pembayaran
bun test tests/payment.test.ts

# Jalankan seluruh test suite
bun test
```

### Menjalankan Integration Test End-to-End:
Pastikan server backend telah aktif berjalan di `http://localhost:3000`:
```bash
BASE_URL=http://localhost:3000 node tests/ai-endpoints.integration.mjs
```

---

## 📖 Panduan Konfigurasi Tambahan

### Konfigurasi Gmail SMTP
Untuk memungkinkan backend mengirimkan email token autentikasi melalui akun Gmail:
1. Buka pengaturan [Keamanan Akun Google](https://myaccount.google.com/security).
2. Pastikan **Verifikasi 2 Langkah (2-Step Verification)** dalam status aktif.
3. Masuk ke menu [Sandi Aplikasi (App Passwords)](https://myaccount.google.com/apppasswords).
4. Buat sandi aplikasi baru (pilih nama aplikasi: `Waru Backend`).
5. Salin 16 digit kode sandi ke dalam variabel `EMAIL_PASS` di file `.env`.

### Konfigurasi Midtrans Payment Gateway
1. Daftar atau masuk ke [Midtrans Merchant Portal](https://dashboard.midtrans.com/).
2. Masuk ke **Settings ➔ Access Keys** untuk mendapatkan:
   - `Merchant ID`
   - `Client Key`
   - `Server Key`
3. Untuk tahap pengujian, gunakan mode **Sandbox**. Pastikan `MIDTRANS_IS_PRODUCTION=false`.
4. Untuk pengujian Webhook lokal: Gunakan reverse proxy tunneling seperti [Ngrok](https://ngrok.com) atau [Localtunnel](https://localtunnel.github.io/www/) untuk meneruskan callback URL `https://your-domain.ngrok-free.app/payment/notification` ke Midtrans Configuration.

---

## 💡 Inspirasi Sistem POS

Arsitektur modul, alur transaksi kasir, dan alur operasional restoran pada **Waru Backend** dirancang dengan mengambil inspirasi dan mengadopsi standar industri dari platform Point of Sale (POS) & Restaurant Management terkemuka:

1. **[Moka POS](https://www.mokapos.com)** *(Cloud POS & Cashier System Indonesia)*:
   - **Inspirasi**: Alur transaksi kasir F&B, pemisahan role operasional (Kasir, Dapur, Owner/Boss), integrasi pembayaran non-tunai QRIS & auto-kalkulasi uang kembalian tunai (*cash change*), serta pemantauan laporan penjualan harian.
   
2. **[Toast POS](https://pos.toasttab.com)** *(All-in-One Restaurant Management Platform)*:
   - **Inspirasi**: Manajemen antrian pesanan dapur (*Kitchen Display System* / KDS workflow: `pending` ➔ `in_progress` ➔ `done`), pelacakan stok bahan baku otomatis (*inventory alerts & adjustment*), dan sistem agregasi rating & ulasan pelanggan.

3. **[Square for Restaurants](https://squareup.com/us/en/point-of-sale/restaurants)** *(Global POS & Ordering System)*:
   - **Inspirasi**: Pengorganisasian katalog menu bertingkat (*item categories*, *availability toggle*, *recommended badges*), manajemen kode promo & diskon fleksibel, serta modularitas REST API yang terisolasi per fitur.

4. **[Majoo](https://majoo.id)** *(Aplikasi Wirausaha & POS Lengkap)*:
   - **Inspirasi**: Struktur Role-Based Access Control (RBAC) bertingkat untuk multi-staf, automasi notifikasi operasional internal, dan dasbor analitik bisnis menyeluruh.

---

## 🤖 Penggunaan AI dalam Pengembangan

Dalam proses pengembangan **Waru Backend**, beberapa modul dan utilitas dikembangkan dengan bantuan **AI (Kiro / AI Assistant)** untuk mempercepat implementasi kode boilerplate, agregasi data, dan integrasi library.

> [!NOTE]
> **Pengecualian (Ide & Desain Orisinal Pengembang)**:  
> Seluruh konsep, alur bisnis sistem POS, serta modul inti **`users/`**, **`cashier/`** (manajemen order & payment), dan **`kitchen/`** (manajemen antrian dapur) merupakan **ide, desain arsitektur, dan logika orisinal murni dari pengembang (bukan hasil rancangan AI)**.

### 📦 Modul (`src/moduls/`) yang Dibantu AI:
- **`register/`**: Implementasi alur registrasi akun, hashing password, penyimpanan user ke MongoDB, dan automasi pengiriman token via email.
- **`login/`**: Implementasi logika autentikasi login, validasi kredensial password, dan pengiriman notifikasi login beserta JWT token ke email.
- **`menu/`**: Implementasi skema validasi, operasi CRUD katalog menu, filter kategori (*Heavy Food* / *Light Food*), serta filter ketersediaan & rekomendasi.
- **`inventory/`**: Implementasi CRUD stok bahan baku, deteksi otomatis *low-stock*, filter kategori, dan penyesuaian (*adjustment*) stok (+/-).
- **`promo/`**: Implementasi kalkulasi potongan diskon (`percentage` / `fixed`), validasi kuota penggunaan, minimum transaksi, dan validitas promo.
- **`review/`**: Implementasi CRUD ulasan pelanggan, agregasi kalkulasi rata-rata rating, dan kurasi publikasi review.
- **`notification/`**: Implementasi sistem distribusi notifikasi internal per target role, filter unread, dan fitur *mark all as read*.
- **`analytics/`**: Implementasi MongoDB aggregation pipeline untuk perangkuman data analitik performa penjualan, omzet harian, top menu, inventaris, dan kepuasan pelanggan dengan filter periode waktu.
- **`business_assistant/`**: Implementasi sistem sesi chat asisten bisnis AI dan *rule-based insight engine* untuk analisis performa resto real-time.
- **`upload/`**: Implementasi penanganan multipart form-data untuk single/multiple file upload, penyimpanan ke disk, pencatatan metadata, dan static file serving.

### 🔧 Utilitas (`src/utils/`) yang Dibantu AI:
- **`jwt/`**: Konfigurasi plugin `@elysia/jwt` (sign & verify token JWT dengan env secret & expiry).
- **`cookies/`**: Helper konfigurasi HTTP-only cookie `waru_token` (secure, sameSite, maxAge).
- **`error/`**: Implementasi *Global Error Handler* dan standarisasi matriks kode error *E-Series* (`E10` - `E99`).
- **`logger/`**: Integrasi logger terstruktur menggunakan Pino & Pino-Pretty.
- **`swagger/`**: Konfigurasi dokumentasi interaktif OpenAPI / Swagger UI di `/docs`.
- **`pagination/`**: Helper kalkulasi pagination parameter (`skip`, `limit`, `page`, `total`, `totalPages`).
- **`security/`**: Helper utilitas hashing dan verifikasi password.
- **`midtrans/`**: Klien integrasi Midtrans Core API (Charge QRIS & Check Transaction Status).

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE.md).  
Hak Cipta (c) 2026 **Waru Team & Rayyan**.


