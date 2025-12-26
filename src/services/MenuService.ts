import { prisma } from '../database';
import { addMinutes } from 'date-fns';
import { config } from '../config';
import { getTodayString } from '../utils/dateUtils';

export class MenuService {
    static async createMenu(content: string, channelId: string, durationMinutes: number = 120, price?: number) {
        const today = getTodayString();

        // Check if menu exists for today
        const existing = await prisma.menu.findUnique({
            where: { date: today },
        });

        if (existing) {
            throw new Error('Hôm nay đã có menu.');
        }

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

    static async getActiveMenu() {
        const today = getTodayString();
        const menu = await prisma.menu.findUnique({
            where: { date: today },
        });

        if (!menu || menu.isClosed || new Date() > menu.expiresAt) {
            return null;
        }
        return menu;
    }

    static async closeMenu(menuId: string) {
        return prisma.menu.update({
            where: { id: menuId },
            data: { isClosed: true }
        });
    }

    static async deleteMenuToday() {
        const today = getTodayString();
        const menu = await prisma.menu.findUnique({
            where: { date: today },
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
