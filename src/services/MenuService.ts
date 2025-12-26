import { prisma } from '../database';
import { addMinutes } from 'date-fns';

export class MenuService {
    static async createMenu(content: string, channelId: string, durationMinutes: number = 120) {
        const today = new Date().toISOString().split('T')[0];

        // Check if menu exists for today
        const existing = await prisma.menu.findUnique({
            where: { date: today },
        });

        if (existing) {
            throw new Error('Hôm nay đã có menu.');
        }

        const expiresAt = addMinutes(new Date(), durationMinutes);

        return prisma.menu.create({
            data: {
                date: today,
                content,
                expiresAt,
                channelId,
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
        const today = new Date().toISOString().split('T')[0];
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
        const today = new Date().toISOString().split('T')[0];
        const menu = await prisma.menu.findUnique({
            where: { date: today },
        });

        if (!menu) {
            throw new Error('Hôm nay không có menu nào để xóa.');
        }

        return prisma.$transaction([
            prisma.order.deleteMany({
                where: { menuId: menu.id }
            }),
            prisma.menu.delete({
                where: { id: menu.id }
            })
        ]);
    }
}
