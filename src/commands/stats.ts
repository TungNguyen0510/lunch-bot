import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { prisma } from '../database';
import { config } from '../config';

export const statsCommand = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Thống kê suất ăn')
        .addSubcommand(subcommand =>
            subcommand
                .setName('month')
                .setDescription('Xem thống kê theo tháng (MM-YYYY)')
                .addStringOption(option =>
                    option.setName('month')
                        .setDescription('Định dạng: MM-YYYY (ví dụ: 12-2025)')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('day')
                .setDescription('Xem thống kê theo ngày (DD-MM-YYYY)')
                .addStringOption(option =>
                    option.setName('date')
                        .setDescription('Định dạng: DD-MM-YYYY (ví dụ: 26-12-2025)')
                        .setRequired(true))
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'month') {
            const inputMonth = interaction.options.getString('month'); // MM-YYYY

            if (!inputMonth || !/^\d{2}-\d{4}$/.test(inputMonth)) {
                await interaction.reply({ content: '❌ Lỗi định dạng. Hãy dùng MM-YYYY (ví dụ: 12-2025).', ephemeral: true });
                return;
            }

            const [month, year] = inputMonth.split('-');
            const dbDatePrefix = `${year}-${month}`; // YYYY-MM (Khớp với format trong DB: YYYY-MM-DD)

            // Tìm tất cả menu trong tháng đó
            const menus = await prisma.menu.findMany({
                where: {
                    date: {
                        startsWith: dbDatePrefix
                    }
                },
                include: {
                    orders: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            const userStats = new Map<string, { displayName: string, count: number, totalAmount: number }>();
            let totalMonthOrders = 0;
            let totalMonthRevenue = 0;

            (menus as any).forEach((menu: any) => {
                menu.orders.forEach((order: any) => {
                    const price = menu.price || config.price;
                    const stat = userStats.get(order.userId) || { displayName: order.user.displayName, count: 0, totalAmount: 0 };
                    stat.count++;
                    stat.totalAmount += price;
                    stat.displayName = order.user.displayName;
                    userStats.set(order.userId, stat);
                    totalMonthOrders++;
                    totalMonthRevenue += price;
                });
            });

            const embed = new EmbedBuilder()
                .setTitle(`📊 Thống kê tháng ${inputMonth}`)
                .setColor(0x0099FF)
                .addFields(
                    { name: '📅 Thông tin chung', value: `Tổng số menu: **${menus.length}**\nTổng số suất đã đặt: **${totalMonthOrders}**`, inline: false }
                );

            if (userStats.size > 0) {
                let details = '';
                let index = 1;
                // Sắp xếp theo số suất giảm dần
                const sortedStats = [...userStats.values()].sort((a, b) => b.count - a.count);

                for (const stat of sortedStats) {
                    const line = `${index++}. **${stat.displayName}**: ${stat.count} suất - **${stat.totalAmount.toLocaleString()} VND**\n`;

                    if (details.length + line.length > 1000) {
                        details += '...';
                        break;
                    }
                    details += line;
                }

                embed.addFields({ name: '👤 Chi tiết từng người', value: details });
                embed.addFields({ name: '💰 Tổng tiền', value: `**${totalMonthRevenue.toLocaleString()} VND**` });
            } else {
                embed.addFields({ name: 'Chi tiết', value: 'Chưa có dữ liệu đặt cơm trong tháng này.' });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else if (subcommand === 'day') {
            const inputDate = interaction.options.getString('date');

            if (!inputDate || !/^\d{2}-\d{2}-\d{4}$/.test(inputDate)) {
                await interaction.reply({ content: '❌ Lỗi định dạng. Hãy dùng DD-MM-YYYY (ví dụ: 26-12-2025).', ephemeral: true });
                return;
            }

            const [day, month, year] = inputDate.split('-');
            const dbDate = `${year}-${month}-${day}`;

            const menus = await prisma.menu.findMany({
                where: { date: dbDate },
                include: {
                    orders: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            if (menus.length === 0) {
                await interaction.reply({ content: `❌ Không tìm thấy dữ liệu menu cho ngày ${inputDate}.`, ephemeral: true });
                return;
            }

            const embeds = [];

            for (const menu of menus) {
                const totalOrders = menu.orders.length;
                const menuPrice = (menu as any).price || config.price;
                const totalRevenue = totalOrders * menuPrice;

                const embed = new EmbedBuilder()
                    .setTitle(`📊 Thống kê - ${menu.content.substring(0, 50)} (${inputDate})`)
                    .setDescription(`Menu: ${menu.content}\nGiá: **${menuPrice.toLocaleString()} VND**`)
                    .setColor(0x00FF00)
                    .addFields(
                        { name: '📅 Thông tin chung', value: `Tổng số suất: **${totalOrders}**\nTổng tiền: **${totalRevenue.toLocaleString()} VND**`, inline: false }
                    );

                if (totalOrders > 0) {
                    const orderList = menu.orders
                        .map((o, i) => `${i + 1}. **${o.user.displayName}**`)
                        .join('\n');

                    embed.addFields({ name: '👤 Người đặt', value: orderList.substring(0, 1024) });
                } else {
                    embed.addFields({ name: '👤 Người đặt', value: '_Chưa có ai đặt_' });
                }
                embeds.push(embed);
            }

            await interaction.reply({ embeds: embeds.slice(0, 10), ephemeral: true });
        }
    },
};
