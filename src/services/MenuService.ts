import { prisma } from '../database';
import { addMinutes } from 'date-fns';
import { config } from '../config';
import { getTodayString } from '../utils/dateUtils';

export class MenuService {
    static async createMenu(content: string, channelId: string, durationMinutes: number = 120, price?: number) {
        const today = getTodayString();

        // Bỏ kiểm tra menu tồn tại để cho phép nhiều menu

        const expiresAt = addMinutes(new Date(), durationMinutes);
        const menuPrice = price || config.price;

        return prisma.menu.create({
            data: {
                date: today,
                content,
                expiresAt,
                channelId,
                price: menuPrice,
                isClosed: false,
            },
        });
    }

    static async updateMessageId(menuId: string, messageId: string) {
        return prisma.menu.update({
            where: { id: menuId },
            data: { messageId },
        });
    }

    static async getActiveMenu(menuId?: string) {
        if (menuId) {
            return prisma.menu.findUnique({
                where: { id: menuId },
            });
        }

        const today = getTodayString();
        // Lấy menu mới nhất của ngày hôm nay chưa đóng và chưa hết hạn
        const menus = await prisma.menu.findMany({
            where: {
                date: today,
                isClosed: false,
                expiresAt: {
                    gt: new Date()
                }
            },
            orderBy: { postedAt: 'desc' },
            take: 1
        });

        return menus.length > 0 ? menus[0] : null;
    }

    static async getMenusByDate(date: string) {
        return prisma.menu.findMany({
            where: { date },
            orderBy: { postedAt: 'asc' },
        });
    }

    static async closeMenu(menuId: string) {
        return prisma.menu.update({
            where: { id: menuId },
            data: { isClosed: true }
        });
    }

    static async deleteMenuLatest() {
        const today = getTodayString();
        const menu = await prisma.menu.findFirst({
            where: { date: today },
            orderBy: { postedAt: 'desc' }
        });

        if (!menu) {
            throw new Error('Hôm nay không có menu nào để xóa.');
        }

        await prisma.$transaction([
            prisma.order.deleteMany({
                where: { menuId: menu.id }
            }),
            prisma.menu.delete({
                where: { id: menu.id }
            })
        ]);

        return menu;
    }
}
