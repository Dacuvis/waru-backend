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
│   │   ├── boss/              # Modul boss
│   │   ├── cashier/           # Modul cashier
│   │   └── kitchen/           # Modul kitchen
│   └── utils/
│       ├── cors/              # CORS settings
│       ├── error/             # Global error handler
│       ├── jwt/               # JWT helper
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
   ```

3. Jalankan server:
   ```bash
   bun run index.ts
   ```

---

## API Endpoints

### Users

| Method | Endpoint      | Keterangan          |
|--------|---------------|---------------------|
| POST   | /users        | Buat user baru      |
| GET    | /users        | Ambil semua user    |
| PUT    | /users/:id    | Update user by ID   |
| DELETE | /users/:id    | Hapus user by ID    |

---

## Environment Variables

| Key        | Keterangan              |
|------------|-------------------------|
| MONGO_URL  | Connection string MongoDB |
