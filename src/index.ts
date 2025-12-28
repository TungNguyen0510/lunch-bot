import { Client, GatewayIntentBits, Interaction, ActionRowBuilder } from 'discord.js';
import { config } from './config';
import { prisma } from './database';
// Import handlers later

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
});

// We will load commands and events here

import { menuCommand } from './commands/menu';
import { helpCommand } from './commands/help';
import { orderCommand } from './commands/order';
import { statsCommand } from './commands/stats';
import { OrderService } from './services/OrderService';
import { createMenuEmbed } from './utils/embeds';
import { getTodayString } from './utils/dateUtils';

// Simple command map for now
const commands = new Map();
commands.set(menuCommand.data.name, menuCommand);
commands.set(orderCommand.data.name, orderCommand);
commands.set(statsCommand.data.name, statsCommand);
commands.set(helpCommand.data.name, helpCommand);

client.once('clientReady', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
});

client.on('interactionCreate', async (interaction: Interaction) => {
    // Sync user displayName (non-blocking)
    if (interaction.user) {
        const displayName = (interaction.member as any)?.displayName || interaction.user.username;
        prisma.user.upsert({
            where: { id: interaction.user.id },
            update: { displayName },
            create: { id: interaction.user.id, displayName },
        }).catch((err: any) => console.error('Failed to sync user:', err));
    }

    if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error: any) {
            console.error(`Error executing command ${interaction.commandName}:`, error);

            // Handle the error centrally
            const errorMessage = `❌ Lỗi: ${error.message || 'Đã có lỗi xảy ra khi thực hiện lệnh này.'}`;

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            } catch (replyError: any) {
                if (replyError.code === 40060) {
                    console.warn('Interaction already acknowledged, ignoring duplicate reply attempt.');
                } else {
                    console.error('Failed to send error reply:', replyError);
                }
            }
        }
    } else if (interaction.isButton()) {
        const { customId, user } = interaction;

        try {
            await interaction.deferReply({ ephemeral: true });

            // Phân tách customId để lấy menuId (format: btn_order:menuId hoặc btn_cancel:menuId)
            const [action, menuId] = customId.split(':');

            if (!menuId) {
                await interaction.editReply('❌ Lỗi: Không tìm thấy ID thực đơn.');
                return;
            }

            const menu = await prisma.menu.findUnique({
                where: { id: menuId },
            });

            if (!menu) {
                await interaction.editReply('❌ Thực đơn không tồn tại.');
                return;
            }

            const isExpired = menu.isClosed || new Date() > new Date(menu.expiresAt);

            if (isExpired) {
                // If expired but buttons are still active, disable them now
                const orders = await OrderService.getOrdersForMenu(menu.id);
                const embed = createMenuEmbed({ ...menu, isClosed: true }, orders);

                const newComponents = interaction.message.components.map(row => {
                    const newRow = ActionRowBuilder.from(row as any);
                    newRow.components.forEach((component: any) => {
                        if (typeof component.setDisabled === 'function') {
                            component.setDisabled(true);
                        }
                    });
                    return newRow;
                });

                await interaction.message.edit({
                    content: '🛑 Đã hết hạn đặt.',
                    embeds: [embed],
                    components: newComponents as any
                });

                await interaction.editReply('❌ Rất tiếc, đã hết hạn đặt.');
                return;
            }

            if (action === 'btn_order') {
                const displayName = (interaction.member as any)?.displayName || user.username;
                await OrderService.placeOrder(user.id, displayName, menu.id);
                await interaction.editReply('✅ Đặt thành công!');
            } else if (action === 'btn_cancel') {
                await OrderService.cancelOrder(user.id, menu.id);
                await interaction.editReply('✅ Huỷ suất thành công!');
            }

            // Update menu embed for the specific menu
            const orders = await OrderService.getOrdersForMenu(menu.id);
            const updatedEmbed = createMenuEmbed(menu, orders);
            await interaction.message.edit({ embeds: [updatedEmbed] });

        } catch (error: any) {
            console.error(error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(`❌ Lỗi: ${error.message}`);
            } else {
                await interaction.reply({ content: `❌ Lỗi: ${error.message}`, ephemeral: true });
            }
        }
    }
});

client.login(config.discordToken);
