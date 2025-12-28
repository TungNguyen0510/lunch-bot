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
                        .setDescription('Thời gian hết hạn (phút), mặc định là 120 phút (2 giờ)')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('price')
                        .setDescription('Giá tiền (VNĐ)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Xóa menu mới tạo gần nhất và tất cả order')
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'post') {
            const content = interaction.options.getString('content');
            const durationMinutes = interaction.options.getInteger('time') || 120;
            const price = interaction.options.getInteger('price');
            if (!content) return;

            await interaction.deferReply();

            const menu = await (MenuService as any).createMenu(content, interaction.channelId, durationMinutes, price);
            const embed = createMenuEmbed(menu, []);

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`btn_order:${menu.id}`)
                        .setLabel('Đặt 1 suất')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`btn_cancel:${menu.id}`)
                        .setLabel('Huỷ suất')
                        .setStyle(ButtonStyle.Danger)
                );

            const message = await interaction.editReply({
                embeds: [embed],
                components: [row],
            });

            await MenuService.updateMessageId(menu.id, message.id);
        } else if (subcommand === 'delete') {
            await interaction.deferReply({ ephemeral: true });

            const deletedMenu = await MenuService.deleteMenuLatest();

            // Delete message on Discord if exists
            if (deletedMenu.channelId && deletedMenu.messageId) {
                try {
                    const channel = await interaction.client.channels.fetch(deletedMenu.channelId);
                    if (channel?.isTextBased()) {
                        const message = await channel.messages.fetch(deletedMenu.messageId);
                        if (message) {
                            await message.delete();
                        }
                    }
                } catch (error) {
                    console.error('Failed to delete menu message:', error);
                    // Silently fail if message already deleted or channel not accessible
                }
            }

            await interaction.editReply({ content: '✅ Đã xóa menu mới tạo gần nhất, toàn bộ các order đính kèm và tin nhắn menu trên Discord.' });
        }
    },
};
