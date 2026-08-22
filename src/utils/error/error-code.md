# Standard Error Code Specification (E-Series)

Dokumen ini berisi spesifikasi lengkap kode error aplikasi untuk menjaga konsistensi respon API antara backend dan frontend.

---

## 1. Master Error Matrix

| Error Code | HTTP Status | Nama Error | Deskripsi / Pemicu Utama |
| :--- | :--- | :--- | :--- |
| **E10** | `400` / `422` | Bad Request / Validation | Format `ObjectId` salah, validasi DTO gagal, stok kurang, atau kurang bayar (*underpayment*). |
| **E20** | `401` / `403` | Unauthorized / Forbidden | Token JWT tidak ditemukan, kadaluwarsa, atau tidak memiliki hak akses. |
| **E30** | `404` | Not Found | Data (Order, Payment, Inventory, Promo, dll) atau endpoint URL tidak ditemukan. |
| **E40** | `409` | Conflict / Duplicate | Melanggar constraint unik di DB (pembayaran ganda `orderId`, email terdaftar). |
| **E50** | `500` | Internal Server Error | Unhandled JS Runtime Error atau kesalahan penanganan logika di server. |
| **E99** | `502` / `500` | Unknown / External Error | Failure dari service eksternal (AI Assistant / Gemini API) atau fallback tak terduga. |

---

## 2. Format Respon JSON

Semua respon error dikembalikan dengan skema tunggal yang seragam:

```json
{
  "status": "error",
  "statusCode": 400,
  "code": "E10",
  "message": "Format ID yang dikirim tidak valid.",
  "details": null
}