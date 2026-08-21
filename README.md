# Waru Backend

Backend untuk aplikasi **Waru** — dibangun dengan [Bun](https://bun.sh), [Elysia](https://elysiajs.com), dan [MongoDB](https://mongodb.com).

---

## Tech Stack

| Tool       | Versi      | Keterangan                  |
|------------|------------|-----------------------------|
| Bun        | latest     | Runtime & package manager   |
| Elysia     | ^1.4.29    | HTTP framework              |
| MongoDB    | 6          | Database                    |
| TypeScript | ^5         | Bahasa utama                |
| Nodemailer | ^9         | Kirim email via SMTP        |
| Prettier   | ^3.9.6     | Code formatter              |

---

## Struktur Proyek

```
waru-backend/
├── index.ts                        # Entry point
├── public/                         # Asset publik (gambar, dll)
├── src/
│   ├── config/
│   │   └── client.ts               # Koneksi MongoDB
│   ├── moduls/
│   │   ├── users/                  # Modul users (CRUD)
│   │   ├── register/               # Modul register dengan JWT
│   │   ├── login/                  # Modul login dengan JWT
│   │   ├── boss/                   # Modul boss
│   │   ├── cashier/                # Modul cashier (orders + payment)
│   │   ├── kitchen/                # Modul kitchen (manajemen antrian dapur)
│   │   ├── inventory/              # Modul inventory (stok bahan baku)
│   │   ├── promo/                  # Modul promo & diskon
│   │   ├── review/                 # Modul ulasan pelanggan
│   │   ├── notification/           # Modul notifikasi internal
│   │   ├── analytics/              # Modul laporan & analitik bisnis
│   │   └── business_assistant/     # Modul AI assistant bisnis
│   └── utils/
│       ├── cors/                   # CORS settings
│       ├── email/                  # Email sender (nodemailer)
│       ├── error/                  # Global error handler
│       ├── jwt/                    # JWT helper (sign & verify)
│       ├── logger/                 # Logger (pino)
│       ├── pagination/             # Pagination helper
│       └── security/               # Hash & security helper
```

---

## Cara Menjalankan

1. Install dependencies:
   ```bash
   bun install
   ```

2. Buat file `.env` di root:
   ```env
   MONGO_URL=mongodb://localhost:27017

   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d

   # Email (Gmail)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-gmail-app-password
   ```

3. Jalankan server:
   ```bash
   bun run index.ts
   ```

---

## API Endpoints

### Auth

| Method | Endpoint        | Keterangan                                    |
|--------|-----------------|-----------------------------------------------|
| POST   | /auth/register  | Daftar akun baru, JWT token dikirim via email |
| POST   | /auth/login     | Login, JWT token dikirim via email            |

#### POST /auth/register
```json
{
  "name": "Rayyan",
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST /auth/login
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Response (register & login)
```json
{
  "message": "Login berhasil! Token dikirim ke email kamu.",
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "64f1a2b3...",
    "name": "Rayyan",
    "email": "user@example.com"
  }
}
```

---

### Users

| Method | Endpoint      | Keterangan          |
|--------|---------------|---------------------|
| POST   | /users        | Buat user baru      |
| GET    | /users        | Ambil semua user    |
| PUT    | /users/:id    | Update user by ID   |
| DELETE | /users/:id    | Hapus user by ID    |

---

### Kitchen

| Method | Endpoint                    | Keterangan                        |
|--------|-----------------------------|-----------------------------------|
| GET    | /kitchen                    | Ambil semua kitchen order         |
| GET    | /kitchen/:id                | Ambil kitchen order by ID         |
| GET    | /kitchen/status/:status     | Filter by status                  |
| POST   | /kitchen                    | Buat kitchen order baru           |
| PUT    | /kitchen/:id                | Update kitchen order              |
| DELETE | /kitchen/:id                | Hapus kitchen order               |

Status: `pending` → `in_progress` → `done` | `cancelled`

---

### Cashier — Orders

| Method | Endpoint                  | Keterangan                              |
|--------|---------------------------|-----------------------------------------|
| GET    | /orders                   | Ambil semua order                       |
| GET    | /orders/:id               | Ambil order by ID                       |
| GET    | /orders/status/:status    | Filter order by status                  |
| POST   | /orders                   | Buat order baru (auto-hitung total)     |
| PUT    | /orders/:id               | Update order                            |
| DELETE | /orders/:id               | Hapus order                             |

### Cashier — Payment

| Method | Endpoint       | Keterangan                                         |
|--------|----------------|----------------------------------------------------|
| GET    | /payment       | Ambil semua payment                                |
| GET    | /payment/:id   | Ambil payment by ID                                |
| POST   | /payment       | Buat payment (otomatis set order → completed)      |
| PUT    | /payment/:id   | Update status payment                              |
| DELETE | /payment/:id   | Hapus payment                                      |

Method pembayaran: `cash` | `transfer` | `qris` | `card`

---

### Inventory

| Method | Endpoint                    | Keterangan                        |
|--------|-----------------------------|-----------------------------------|
| GET    | /inventory                  | Ambil semua item                  |
| GET    | /inventory/:id              | Ambil item by ID                  |
| GET    | /inventory/low-stock        | Item di bawah stok minimum        |
| GET    | /inventory/category/:cat    | Filter by kategori                |
| POST   | /inventory                  | Tambah item baru                  |
| PATCH  | /inventory/:id/stock        | Adjust stok (+ tambah / - kurang) |
| PUT    | /inventory/:id              | Update item                       |
| DELETE | /inventory/:id              | Hapus item                        |

---

### Promo

| Method | Endpoint       | Keterangan                              |
|--------|----------------|-----------------------------------------|
| GET    | /promo         | Ambil semua promo                       |
| GET    | /promo/active  | Ambil promo yang sedang aktif           |
| GET    | /promo/:id     | Ambil promo by ID                       |
| POST   | /promo         | Buat promo baru                         |
| POST   | /promo/apply   | Hitung diskon dari kode promo           |
| PUT    | /promo/:id     | Update promo                            |
| DELETE | /promo/:id     | Hapus promo                             |

---

### Review

| Method | Endpoint                    | Keterangan                        |
|--------|-----------------------------|-----------------------------------|
| GET    | /review                     | Ambil semua review                |
| GET    | /review/published           | Ambil review yang dipublikasikan  |
| GET    | /review/rating              | Rata-rata rating (query: target)  |
| GET    | /review/target/:target      | Filter by target (menu/service)   |
| GET    | /review/:id                 | Ambil review by ID                |
| POST   | /review                     | Buat review baru                  |
| PUT    | /review/:id                 | Update review                     |
| DELETE | /review/:id                 | Hapus review                      |

---

### Notification

| Method | Endpoint                      | Keterangan                            |
|--------|-------------------------------|---------------------------------------|
| GET    | /notification                 | Ambil semua notifikasi                |
| GET    | /notification/unread          | Ambil notifikasi belum dibaca         |
| GET    | /notification/target/:target  | Filter by target                      |
| GET    | /notification/:id             | Ambil notifikasi by ID                |
| POST   | /notification                 | Buat notifikasi baru                  |
| PATCH  | /notification/read-all        | Tandai semua notifikasi sudah dibaca  |
| PUT    | /notification/:id             | Update notifikasi                     |
| DELETE | /notification/:id             | Hapus notifikasi                      |

---

### Analytics

| Method | Endpoint               | Keterangan                                    |
|--------|------------------------|-----------------------------------------------|
| GET    | /analytics/dashboard   | Ringkasan lengkap (sales + menu + inventory + review) |
| GET    | /analytics/sales       | Overview penjualan                            |
| GET    | /analytics/sales/daily | Grafik penjualan harian                       |
| GET    | /analytics/menu/top    | Top menu terlaris                             |
| GET    | /analytics/inventory   | Ringkasan inventory                           |
| GET    | /analytics/reviews     | Ringkasan rating & ulasan                     |

Query parameter: `?period=today|week|month|year|custom` (+ `startDate` & `endDate` untuk custom)

---

### Business Assistant

| Method | Endpoint                  | Keterangan                                  |
|--------|---------------------------|---------------------------------------------|
| GET    | /assistant                | Ambil semua sesi chat                       |
| GET    | /assistant/:id            | Ambil sesi beserta riwayat chat             |
| POST   | /assistant                | Buat sesi baru + pesan pertama              |
| POST   | /assistant/:id/message    | Kirim pesan ke sesi yang ada                |
| DELETE | /assistant/:id            | Hapus sesi                                  |

---

## Environment Variables

| Key            | Keterangan                          |
|----------------|-------------------------------------|
| MONGO_URL      | Connection string MongoDB           |
| JWT_SECRET     | Secret key untuk sign JWT token     |
| JWT_EXPIRES_IN | Durasi token, contoh: `7d`, `1h`    |
| EMAIL_HOST     | SMTP host, default `smtp.gmail.com` |
| EMAIL_PORT     | SMTP port, default `587`            |
| EMAIL_USER     | Email pengirim (Gmail)              |
| EMAIL_PASS     | App password Gmail                  |

---

## Catatan Gmail App Password

Untuk menggunakan Gmail sebagai SMTP, kamu perlu membuat **App Password**:

1. Buka [myaccount.google.com/security](https://myaccount.google.com/security)
2. Aktifkan **2-Step Verification**
3. Buka [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. Buat app password baru → salin ke `EMAIL_PASS` di `.env`

---

## Penggunaan AI dalam Pengembangan

Beberapa bagian dari proyek ini dikembangkan dengan bantuan **AI (Kiro)**:

### `src/moduls/`
- **`login/`** — Logika autentikasi login dibuat dengan bantuan AI, mencakup validasi input, pengecekan password, dan pengiriman JWT token via email.
- **`register/`** — Alur registrasi akun dibuat dengan bantuan AI, mencakup validasi data, hashing password, penyimpanan user ke MongoDB, dan pengiriman token via email.
- **`kitchen/`** — Modul manajemen antrian dapur dibuat dengan bantuan AI, mencakup type, model, validasi, service (dengan logger & pagination), controller, dan route lengkap.
- **`cashier/`** — Modul kasir dibuat dengan bantuan AI menggunakan 2 collection terpisah (`orders` dan `payment`), mencakup auto-kalkulasi subtotal & total order, validasi pembayaran, penghitungan kembalian, dan update status order otomatis.
- **`inventory/`** — Modul manajemen stok bahan baku dibuat dengan bantuan AI, mencakup CRUD, filter low-stock, filter kategori, dan endpoint adjust stok (+/-).
- **`promo/`** — Modul promo & diskon dibuat dengan bantuan AI, mencakup CRUD, filter promo aktif, dan endpoint apply promo (hitung diskon berdasarkan tipe + validasi kuota & minimum order).
- **`review/`** — Modul ulasan pelanggan dibuat dengan bantuan AI, mencakup CRUD, filter published, filter by target, dan agregasi rata-rata rating.
- **`notification/`** — Modul notifikasi internal dibuat dengan bantuan AI, mencakup CRUD, filter unread, filter by target, dan endpoint mark-all-read.
- **`analytics/`** — Modul laporan & analitik bisnis dibuat dengan bantuan AI, menggunakan MongoDB aggregation pipeline untuk merangkum data dari beberapa collection (orders, payment, inventory, review) dengan dukungan period filter.
- **`business_assistant/`** — Modul AI assistant bisnis dibuat dengan bantuan AI, mencakup sistem sesi chat dan rule-based insight engine yang menganalisis data bisnis real-time untuk menghasilkan rekomendasi.

### `src/utils/`
- **`jwt/`** — Sistem JWT (sign & verify token) dibuat dengan bantuan AI, termasuk penanganan expiry dan secret key dari environment variable.

> Kode yang dihasilkan AI telah ditinjau dan disesuaikan dengan kebutuhan proyek.

### Pengujian bagian AI

Setelah API, MongoDB, dan SMTP test server berjalan, jalankan seluruh pengujian endpoint
yang tercantum di atas dengan:

```bash
BASE_URL=http://localhost:3000 node tests/ai-endpoints.integration.mjs
```

Pengujian khusus utilitas JWT dapat dijalankan dengan:

```bash
bun test tests/jwt.test.ts
```
