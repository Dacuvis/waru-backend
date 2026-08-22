import { ObjectId } from "mongodb";
import { buildPaginationResult, parsePagination, type PaginationQuery, type PaginationResult } from "../../utils/pagination/pagination";
import { MenuModel } from "./menu.model";
import { logger } from "../../utils/logger/logger";
import { AppError } from "../../utils/error/error-global-handler";
import type { Menu, UpdateMenu } from "./menu.type";

export class MenuService {
  private model = new MenuModel()

  async findAll(query: PaginationQuery) {
    const { page, limit, skip } = parsePagination(query);
    logger.info(`Fetching menu items: page=${page}, limit=${limit}, skip=${skip}`);

    const { data, total } = await this.model.findAll(skip, limit);
    return buildPaginationResult(data, total, page, limit);
  }

  async findById(id: string) {
    const menu = await this.model.findById(new ObjectId(id));
    if (!menu) throw new AppError("Menu item not found", 404, "E30")
    logger.info(`Menu item found: id=${id}`);
    return menu;
  }

  async create(menu: Menu) {
    const now = new Date();
    const menus = { ...menu, createdAt: now, updatedAt: now }
    logger.info(`Creating menu item: ${JSON.stringify(menus)}`);
    return await this.model.create(menus);
  }

  async update(id: string, menu: UpdateMenu) {
    const existingMenu = await this.model.findById(new ObjectId(id));
    if (!existingMenu) throw new AppError("Menu item not found", 404, "E30");
  
    const updatedMenu = await this.model.update(new ObjectId(id), {
      ...menu,
      updatedAt: new Date(),
    });
    logger.info(`Updating menu item: id=${id}`);
    return updatedMenu;
  }

  async delete(id: string) {
    const existingMenu = await this.model.findById(new ObjectId(id));
    if (!existingMenu) throw new AppError("Menu item not found", 404, "E30")
    logger.info(`Deleting menu item: id=${id}`);
    return await this.model.delete(new ObjectId(id));
  }
}