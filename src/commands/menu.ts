import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { MenuService } from '../services/MenuService';
import { createMenuEmbed } from '../utils/embeds';

export const menuCommand = {
    data: new SlashCommandBuilder()
        .setName('menu')
        .setDescription('Tạo menu cơm trưa')
        .addSubcommand(subcommand =>
            subcommand
                .setName('post')
                .setDescription('Tạo menu cơm trưa')
                .addStringOption(option =>
                    option.setName('content')
                        .setDescription('Menu')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('time')
                        .setDescription('Thời gian hết hạn (phút), mặc định là 120 (2 giờ)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Xóa menu hôm nay và các order')
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'post') {
            const content = interaction.options.getString('content');
            const durationMinutes = interaction.options.getInteger('time') || 120;
            if (!content) return;

            try {
                await interaction.deferReply();

                const menu = await MenuService.createMenu(content, interaction.channelId, durationMinutes);
                const embed = createMenuEmbed(menu, []);

                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('btn_order')
                            .setLabel('Đặt 1 suất')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('btn_cancel')
                            .setLabel('Huỷ suất')
                            .setStyle(ButtonStyle.Danger)
                    );

                const message = await interaction.editReply({
                    embeds: [embed],
                    components: [row],
                });

                await MenuService.updateMessageId(menu.id, message.id);

            } catch (error: any) {
                console.error(error);
                if (interaction.deferred) {
                    await interaction.editReply({ content: `❌ Lỗi: ${error.message}` });
                } else {
                    await interaction.reply({ content: `❌ Lỗi: ${error.message}`, ephemeral: true });
                }
            }
        } else if (subcommand === 'delete') {
            try {
                await interaction.deferReply({ ephemeral: true });
                await MenuService.deleteMenuToday();
                await interaction.editReply({ content: '✅ Đã xóa menu hôm nay và toàn bộ các order đính kèm. Bạn có thể tạo menu mới ngay bây giờ.' });
            } catch (error: any) {
                await interaction.editReply({ content: `❌ Lỗi: ${error.message}` });
            }
        }
    },
};
