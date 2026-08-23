# Moduls

Folder ini berisi semua modul fitur dari aplikasi Waru. Setiap modul memiliki struktur file yang konsisten.

---

## Struktur Per Modul

```
<nama-modul>/
├── <modul>.model.ts        # Query langsung ke MongoDB
├── <modul>.service.ts      # Business logic & validasi
├── <modul>.controller.ts   # Jembatan antara route dan service
├── <modul>.route.ts        # Definisi endpoint HTTP
├── <modul>.type.ts         # Interface & type TypeScript
└── <modul>.validation.ts   # Validasi request (schema)
```

---

## Daftar Modul

### `users/`
Mengelola data user aplikasi.

| Method | Endpoint      | Keterangan          |
|--------|---------------|---------------------|
| POST   | /users        | Buat user baru      |
| GET    | /users        | Ambil semua user    |
| PUT    | /users/:id    | Update user by ID   |
| DELETE | /users/:id    | Hapus user by ID    |

---

### `boss/`
Modul khusus untuk role boss. *(dalam pengembangan)*

---

### `cashier/`
Modul khusus untuk role kasir. *(dalam pengembangan)*

---

### `kitchen/`
Modul khusus untuk role dapur. *(dalam pengembangan)*

---

### `upload/`
Modul untuk upload file dan penyimpanan ke folder `public/uploads`.

| Method | Endpoint          | Keterangan                             |
|--------|-------------------|----------------------------------------|
| GET    | /upload           | Ambil daftar file yang sudah diunggah  |
| GET    | /upload/:id       | Ambil info metadata file by ID         |
| POST   | /upload           | Unggah single file                     |
| POST   | /upload/single    | Unggah single file                     |
| POST   | /upload/multiple  | Unggah multiple files                  |
| DELETE | /upload/:id       | Hapus metadata dan file fisik dari disk|

---

## Catatan

- Semua error dilempar menggunakan `AppError` dari `utils/error/`.
- Validasi input dilakukan di layer **service**, bukan controller.
- Koneksi database diambil dari `src/config/client.ts`.
