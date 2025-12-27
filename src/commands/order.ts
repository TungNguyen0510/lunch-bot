import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MenuService } from '../services/MenuService';
import { OrderService } from '../services/OrderService';
import { config } from '../config';
import { getTodayString } from '../utils/dateUtils';

export const orderCommand = {
    data: new SlashCommandBuilder()
        .setName('order')
        .setDescription('Xem danh sách order')
        .addSubcommand(subcommand =>
            subcommand
                .setName('today')
                .setDescription('Hiển thị danh sách order cho ngày hôm nay')
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.options.getSubcommand() === 'today') {
            const today = getTodayString();
            const menus = await MenuService.getMenusByDate(today);

            if (menus.length === 0) {
                await interaction.reply({ content: 'Không có suất ăn nào cho ngày hôm nay.', ephemeral: true });
                return;
            }

            const embeds = [];

            for (const menu of menus) {
                const orders = await OrderService.getOrdersForMenu(menu.id);
                const totalOrders = orders.length;
                const menuPrice = (menu as any).price || config.price;
                const totalRevenue = totalOrders * menuPrice;
                const formattedDate = menu.date.split('-').reverse().join('-');

                const embed = new EmbedBuilder()
                    .setTitle(`📊 Thống kê - ${menu.content.substring(0, 50)} (${formattedDate})`)
                    .setDescription(`Menu: ${menu.content}\nGiá: **${menuPrice.toLocaleString()} VND**`)
                    .setColor(0x00FF00)
                    .addFields(
                        { name: '📅 Thông tin chung', value: `Tổng số suất: **${totalOrders}**\nTổng tiền: **${totalRevenue.toLocaleString()} VND**`, inline: false }
                    );

                if (totalOrders > 0) {
                    const orderList = (orders as any)
                        .map((o: any, i: number) => `${i + 1}. **${o.user.displayName}**`)
                        .join('\n');

                    embed.addFields({ name: '👤 Người đặt', value: orderList.substring(0, 1024) });
                } else {
                    embed.addFields({ name: '👤 Người đặt', value: '_Chưa có ai đặt_' });
                }
                embeds.push(embed);
            }

            await interaction.reply({ embeds: embeds.slice(0, 10) }); // Discord allows up to 10 embeds
        }
    },
};
