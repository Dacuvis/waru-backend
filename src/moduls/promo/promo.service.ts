import { AppError } from "../../utils/error/error-global-handler";
import { logger } from "../../utils/logger/logger";
import {
  parsePagination,
  buildPaginationResult,
  type PaginationQuery,
} from "../../utils/pagination/pagination";
import { PromoModel } from "./promo.model";
import type { CreatePromo, UpdatePromo, ApplyPromo } from "./promo.type";

export class PromoService {
  private model = new PromoModel();

  async getAll(query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit }, "Mengambil daftar promo");

    const { data, total } = await this.model.getAll(skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async getById(id: string) {
    const promo = await this.model.getById(id);
    if (!promo) throw new AppError(`Promo dengan id ${id} tidak ditemukan`, 404, "E30");
    logger.info({ promoId: id }, "Mengambil promo by id");
    return promo;
  }

  async getActive(query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(query);
    logger.info({ page, limit }, "Mengambil promo aktif");

    const { data, total } = await this.model.getActive(skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async create(data: CreatePromo) {
    // Cek kode unik
    const existing = await this.model.getByCode(data.code);
    if (existing) throw new AppError(`Kode promo "${data.code}" sudah digunakan`, 409, "E40");

    if (data.type === "percentage" && data.discountValue > 100) {
      throw new AppError("Diskon persentase tidak boleh lebih dari 100", 400, "E10");
    }
    if (data.type === "buy_x_get_y" || data.type === "free_item") {
      throw new AppError(
        `Tipe promo ${data.type} belum didukung karena detail item promo belum tersedia`,
        400, "E10"
      );
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (isNaN(startDate.getTime())) throw new AppError("Format startDate tidak valid", 400, "E10");
    if (isNaN(endDate.getTime())) throw new AppError("Format endDate tidak valid", 400, "E10");
    if (endDate <= startDate) throw new AppError("endDate harus setelah startDate", 400, "E10");

    const now = new Date();
    const promo = {
      ...data,
      code: data.code.toUpperCase(),
      startDate,
      endDate,
      usageCount: 0,
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.model.create(promo);
    logger.info({ promoId: result.insertedId, code: promo.code }, "Promo baru dibuat");
    return result;
  }

  async update(id: string, data: UpdatePromo) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Promo dengan id ${id} tidak ditemukan`, 404, "E30");

    const resultingType = data.type ?? existing.type;
    if (resultingType === "percentage" && (data.discountValue ?? existing.discountValue) > 100) {
      throw new AppError("Diskon persentase tidak boleh lebih dari 100", 400, "E10");
    }
    if (data.type === "buy_x_get_y" || data.type === "free_item") {
      throw new AppError(
        `Tipe promo ${data.type} belum didukung karena detail item promo belum tersedia`,
        400,
        "E10",
      );
    }

    const updateData: any = { ...data, updatedAt: new Date() };

    const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;
    if (isNaN(startDate.getTime())) throw new AppError("Format startDate tidak valid", 400, "E10");
    if (isNaN(endDate.getTime())) throw new AppError("Format endDate tidak valid", 400, "E10");
    if (endDate <= startDate) throw new AppError("endDate harus setelah startDate", 400, "E10");
    if (data.startDate) updateData.startDate = startDate;
    if (data.endDate) updateData.endDate = endDate;
    const updated = await this.model.update(id, updateData);
    logger.info({ promoId: id }, "Promo diupdate");
    return updated;
  }

  async applyPromo(data: ApplyPromo) {
    const promo = await this.model.getByCode(data.code.toUpperCase());
    if (!promo) throw new AppError(`Kode promo "${data.code}" tidak ditemukan`, 404, "E30");

    const now = new Date();
    const promoData = promo as any;

    if (promoData.status !== "active") throw new AppError("Promo tidak aktif", 400, "E10");
    if (now < new Date(promoData.startDate)) throw new AppError("Promo belum dimulai", 400, "E10");
    if (now > new Date(promoData.endDate)) throw new AppError("Promo sudah berakhir", 400, "E10");

    if (promoData.minimumOrder && data.orderTotal < promoData.minimumOrder) {
      throw new AppError(
        `Minimum order untuk promo ini adalah Rp ${promoData.minimumOrder}`,
        400,
        "E10",
      );
    }

    if (promoData.usageLimit && promoData.usageCount >= promoData.usageLimit) {
      throw new AppError("Kuota promo sudah habis", 400, "E10");
    }

    // Hitung diskon
    let discountAmount = 0;
    if (promoData.type === "percentage") {
      discountAmount = (data.orderTotal * promoData.discountValue) / 100;
      if (promoData.maxDiscount) {
        discountAmount = Math.min(discountAmount, promoData.maxDiscount);
      }
    } else if (promoData.type === "fixed") {
      discountAmount = Math.min(promoData.discountValue, data.orderTotal);
    }

    const finalTotal = data.orderTotal - discountAmount;

    // Tambah usage count
    const consumed = await this.model.consumeUsage(String(promoData._id), now);
    if (!consumed) {
      throw new AppError("Promo sudah tidak aktif atau kuotanya baru saja habis", 409, "E40");
    }

    logger.info(
      { promoCode: data.code, discountAmount, finalTotal },
      "Promo berhasil diaplikasikan",
    );

    return {
      code: promoData.code,
      promoName: promoData.name,
      orderTotal: data.orderTotal,
      discountAmount,
      finalTotal,
    };
  }

  async delete(id: string) {
    const existing = await this.model.getById(id);
    if (!existing) throw new AppError(`Promo dengan id ${id} tidak ditemukan`, 404, "E30");

    const deleted = await this.model.delete(id);
    logger.info({ promoId: id }, "Promo dihapus");
    return deleted;
  }
}
