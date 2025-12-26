import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MenuService } from '../services/MenuService';
import { OrderService } from '../services/OrderService';

export const orderCommand = {
    data: new SlashCommandBuilder()
        .setName('order')
        .setDescription('Quản lý suất ăn')
        .addSubcommand(subcommand =>
            subcommand
                .setName('today')
                .setDescription('Hiển thị danh sách cho ngày hôm nay')
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.options.getSubcommand() === 'today') {
            const menu = await MenuService.getActiveMenu();
            if (!menu) {
                await interaction.reply({ content: 'Không có suất ăn nào cho ngày hôm nay.', ephemeral: true });
                return;
            }

            const orders = await OrderService.getOrdersForMenu(menu.id);

            const embed = new EmbedBuilder()
                .setTitle(`Đặt cơm trưa cho ngày ${menu.date.split('-').reverse().join('/')}`)
                .setDescription(`Tổng số suất: ${orders.length}`)
                .setColor(0x0099FF);

            if (orders.length > 0) {
                const orderList = (orders as any).map((o: any, index: number) => `${index + 1}. ${o.user.displayName}`).join('\n');
                embed.addFields({ name: 'Danh sách', value: orderList.substring(0, 1024) });
            } else {
                embed.addFields({ name: 'Danh sách', value: 'Chưa có ai đặt.' });
            }

            await interaction.reply({ embeds: [embed] });
        }
    },
};
