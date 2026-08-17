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
├── index.ts                   # Entry point
├── public/                    # Asset publik (gambar, dll)
├── src/
│   ├── config/
│   │   └── client.ts          # Koneksi MongoDB
│   ├── moduls/
│   │   ├── users/             # Modul users (CRUD)
│   │   ├── register/          # Modul register dengan JWT
│   │   ├── login/             # Modul login dengan JWT
│   │   ├── boss/              # Modul boss
│   │   ├── cashier/           # Modul cashier
│   │   └── kitchen/           # Modul kitchen
│   └── utils/
│       ├── cors/              # CORS settings
│       ├── email/             # Email sender (nodemailer)
│       ├── error/             # Global error handler
│       ├── jwt/               # JWT helper (sign & verify)
│       ├── logger/            # Logger
│       ├── pagination/        # Pagination helper
│       └── security/          # Hash & security helper
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

### `src/utils/`
- **`jwt/`** — Sistem JWT (sign & verify token) dibuat dengan bantuan AI, termasuk penanganan expiry dan secret key dari environment variable.

> Kode yang dihasilkan AI telah ditinjau dan disesuaikan dengan kebutuhan proyek.
