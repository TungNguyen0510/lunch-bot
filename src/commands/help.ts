import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export const helpCommand = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Xem danh sách các lệnh'),
    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setTitle('Danh sách lệnh')
            .setColor(0x0099FF)
            .addFields(
                { name: '/menu post [content]', value: 'Tạo menu cơm trưa mới' },
                { name: '/menu delete', value: 'Xóa menu hôm nay và tất cả order' },
                { name: '/order today', value: 'Xem danh sách đặt cơm hôm nay' },
                { name: '/stats month [MM-YYYY]', value: 'Xem thống kê tháng' },
                { name: '/stats day [DD-MM-YYYY]', value: 'Xem thống kê ngày' },
                { name: '/help', value: 'Xem danh sách lệnh' }
            )
            .setFooter({ text: 'Bot đặt cơm' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
