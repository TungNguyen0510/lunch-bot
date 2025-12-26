import { Client, GatewayIntentBits, Collection, Interaction, ActionRowBuilder } from 'discord.js';
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

// Simple command map for now
const commands = new Map();
commands.set(menuCommand.data.name, menuCommand);
commands.set(orderCommand.data.name, orderCommand);
commands.set(statsCommand.data.name, statsCommand);
commands.set(helpCommand.data.name, helpCommand);

client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
});

client.on('interactionCreate', async (interaction: Interaction) => {
    // Sync user displayName
    if (interaction.user) {
        const displayName = (interaction.member as any)?.displayName || interaction.user.username;
        await prisma.user.upsert({
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
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    } else if (interaction.isButton()) {
        const { customId, user } = interaction;

        try {
            await interaction.deferReply({ ephemeral: true });

            // Get today's menu (regardless of expiration)
            const today = new Date().toISOString().split('T')[0];
            const menu = await prisma.menu.findUnique({
                where: { date: today },
            });

            if (!menu) {
                await interaction.editReply('❌ Menu không tồn tại.');
                return;
            }

            const isExpired = menu.isClosed || new Date() > menu.expiresAt;

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
                    content: '🛑 Đã hết hạn đặt cơm.',
                    embeds: [embed],
                    components: newComponents as any
                });

                await interaction.editReply('❌ Rất tiếc, đã hết hạn đặt cơm.');
                return;
            }

            if (customId === 'btn_order') {
                const displayName = (interaction.member as any)?.displayName || user.username;
                await OrderService.placeOrder(user.id, displayName);
                await interaction.editReply('✅ Đặt cơm thành công!');
            } else if (customId === 'btn_cancel') {
                await OrderService.cancelOrder(user.id);
                await interaction.editReply('✅ Huỷ suất thành công!');
            }

            // Update menu embed for active menu
            const orders = await OrderService.getOrdersForMenu(menu.id);
            const updatedEmbed = createMenuEmbed(menu, orders);
            await interaction.message.edit({ embeds: [updatedEmbed] });

        } catch (error: any) {
            await interaction.editReply(`❌ Lỗi: ${error.message}`);
        }
    }
});

client.login(config.discordToken);
