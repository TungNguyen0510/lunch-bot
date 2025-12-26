import { prisma } from '../database';
import { MenuService } from './MenuService';

export class OrderService {
    static async placeOrder(userId: string, displayName: string) {
        const menu = await MenuService.getActiveMenu();
        if (!menu) {
            throw new Error('Menu đã hết hạn hoặc không tồn tại.');
        }

        // Upsert user to ensure latest displayName
        await prisma.user.upsert({
            where: { id: userId },
            update: { displayName },
            create: { id: userId, displayName },
        });

        // Check if already ordered
        const existingOrder = await prisma.order.findUnique({
            where: {
                menuId_userId: {
                    menuId: menu.id,
                    userId,
                },
            },
        });

        if (existingOrder) {
            throw new Error('Bạn đã đặt rồi.');
        }

        return prisma.order.create({
            data: {
                menuId: menu.id,
                userId,
            },
        });
    }

    static async cancelOrder(userId: string) {
        const menu = await MenuService.getActiveMenu();
        if (!menu) {
            throw new Error('Menu không tồn tại.');
        }

        try {
            return await prisma.order.delete({
                where: {
                    menuId_userId: {
                        menuId: menu.id,
                        userId,
                    },
                },
            });
        } catch (e) {
            throw new Error('Bạn chưa đặt.');
        }
    }

    static async getOrdersForMenu(menuId: string) {
        return prisma.order.findMany({
            where: { menuId },
            include: { user: true },
            orderBy: { orderedAt: 'asc' },
        });
    }
}
